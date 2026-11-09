/**

 * @jest-environment-options {"resources": "usable"}
 */
import { expect, jest, test } from '@jest/globals';
import type { Hex } from '../utility/hex';

jest.setTimeout(120_000);

test('ordinary Boomerang Tool damages both the single-hex enemy and the large enemy in its sweep', async () => {
	const { createGame, disposeGame } = await import('./simulation/botgeria');
	const { Creature } = await import('../creature');
	const { default: loadDarkPriest } = await import('../abilities/Dark-Priest');
	const { default: loadHeadless } = await import('../abilities/Headless');
	const { default: loadBountyHunter } = await import('../abilities/Bounty-Hunter');
	const { default: loadStomper } = await import('../abilities/Stomper');
	const game = await createGame([loadDarkPriest, loadHeadless, loadBountyHunter, loadStomper]);

	try {
		game.players.forEach((player) => {
			player.controller = 'human';
		});
		game.abilityUpgrades = 3;
		// Positions and materialization state from the reported pre-attack encounter.
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
		const small = new Creature(
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
		const large = new Creature(
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
		expect(boomerang.isUpgraded()).toBe(false);
		expect(boomerang.require()).toBe(true);
		expect([small.health, large.health]).toEqual([100, 135]);

		// Use the real targeting query to obtain the rightward throw selected by
		// an empty lower-row hex, then run the real ability and projectile tween.
		const query = jest.spyOn(game.grid, 'queryChoice');
		boomerang.query();
		const { choices } = query.mock.calls[0][0] as { choices: Hex[][] };
		const clicked = game.grid.hexes[5][6];
		expect(clicked.creature).toBeUndefined();
		const choice = choices.find((hexes) => hexes.includes(clicked));
		expect(choice).toBeDefined();
		expect(choice.filter((hex) => hex.creature === large)).toHaveLength(2);
		const completed = jest.spyOn(headless, 'queryMove');
		boomerang.activate(choice);
		expect([small.health, large.health]).toEqual([100, 135]);
		game.headlessDriver.stepFrames(100);

		expect(completed).toHaveBeenCalledTimes(1);
		expect(small.health).toBe(90);
		// Ordinary area damage is applied once, accounting for Stomper's defenses,
		// even though both of its occupied hexes lie in the damaging lower row.
		expect(large.health).toBe(126);
	} finally {
		disposeGame(game);
	}
});
