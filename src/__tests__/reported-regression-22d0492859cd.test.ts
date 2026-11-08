/**

 * @jest-environment-options {"resources": "usable"}
 */
import { expect, jest, test } from '@jest/globals';
import { createGame, disposeGame } from './simulation/botgeria';
import loadDarkPriestAbilities from '../abilities/Dark-Priest';
import loadHeadlessAbilities from '../abilities/Headless';
import loadBountyHunterAbilities from '../abilities/Bounty-Hunter';
import loadStomperAbilities from '../abilities/Stomper';
import { Creature } from '../creature';
import type { Hex } from '../utility/hex';

jest.setTimeout(120_000);

test('unupgraded Boomerang Tool damages both enemies, including a multihex enemy in the lower sweep', async () => {
	// Recreate the supplied pre-attack save's combatants and positions. The
	// existing harness stubs presentation, but uses real abilities, creatures,
	// damage calculation and a real Phaser HEADLESS engine for projectile flight.
	const game = await createGame([
		loadDarkPriestAbilities,
		loadHeadlessAbilities,
		loadBountyHunterAbilities,
		loadStomperAbilities,
	]);
	try {
		game.turn = 2;
		game.abilityUpgrades = 3;
		game.players.forEach((player) => {
			player.controller = 'human';
		});

		const headless = new Creature(
			{
				...game.retrieveCreatureStats('W4'),
				x: 5,
				y: 4,
				team: 0,
				temp: false,
				materializationSickness: false,
			},
			game,
		);
		const bountyHunter = new Creature(
			{
				...game.retrieveCreatureStats('A2'),
				x: 8,
				y: 3,
				team: 1,
				temp: false,
				materializationSickness: false,
			},
			game,
		);
		const stomper = new Creature(
			{
				...game.retrieveCreatureStats('E3'),
				x: 10,
				y: 5,
				team: 1,
				temp: false,
				materializationSickness: true,
			},
			game,
		);
		game.activeCreature = headless;
		const boomerang = headless.abilities[3];
		const stomperDamage = jest.spyOn(stomper, 'takeDamage');
		expect(boomerang.isUpgraded()).toBe(false);
		expect([bountyHunter.health, stomper.health]).toEqual([100, 135]);

		// Use the native rightward choice containing the empty upper-row hex
		// between Headless and Bounty Hunter, rather than fabricating a hit list.
		const sweep: Hex[] = boomerang._getHexes(false);
		expect(sweep).toContain(game.grid.hexes[3][7]);
		expect(game.grid.hexes[3][7].creature).toBeUndefined();
		expect(sweep.filter((hex) => hex.y === 5 && hex.creature === stomper).length).toBeGreaterThan(
			1,
		);

		boomerang.activate(sweep);
		// Damage must wait for flight, not happen at selection time.
		expect([bountyHunter.health, stomper.health]).toEqual([100, 135]);
		game.headlessDriver.stepFrames(100);

		expect(bountyHunter.health).toBe(90);
		expect(stomper.health).toBeLessThan(135);
		// The unupgraded ability damages a unit once, not once per occupied hex.
		expect(stomperDamage).toHaveBeenCalledTimes(1);
	} finally {
		disposeGame(game);
		jest.restoreAllMocks();
	}
});
