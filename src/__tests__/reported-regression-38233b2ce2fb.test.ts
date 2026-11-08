/**

 * @jest-environment-options {"resources": "usable"}
 */
import { expect, jest, test } from '@jest/globals';
import loadDarkPriest from '../abilities/Dark-Priest';
import loadHeadless from '../abilities/Headless';
import loadBountyHunter from '../abilities/Bounty-Hunter';
import loadStomper from '../abilities/Stomper';
import { Creature } from '../creature';
import { createHeadlessGame, destroyHeadlessGame, settle } from '../engine/headlessGame';
import { loadRealPhaser } from '../phaser/runtime';
import type { Hex } from '../utility/hex';

// Only the DOM-bound UI is replaced; creatures, targeting, flight and damage are real.
jest.mock('../ui/interface', () => {
	const noop = (): any => new Proxy(function () {}, { get: () => noop(), apply: () => noop() });
	return {
		UI: class {
			constructor() {
				return new Proxy(
					{ selectedAbility: -1, active: false, dashopen: false, glowInterval: undefined },
					{
						get: (target, key) => (key in target ? target[key] : noop()),
						set: (target, key, value) => {
							target[key] = value;
							return true;
						},
					},
				);
			}
		},
	};
});

jest.setTimeout(90_000);

test('an unupgraded rightward Boomerang Tool sweep damages both the upper enemy and the multi-hex lower enemy', async () => {
	await loadRealPhaser();
	const game = await createHeadlessGame(
		[loadDarkPriest, loadHeadless, loadBountyHunter, loadStomper],
		{ config: { players: [0, 1], abilityUpgrades: 3 } },
	);
	try {
		await settle(game);
		const place = (type: string, x: number, y: number, team: number, sick = false) =>
			new Creature(
				{
					...game.retrieveCreatureStats(type),
					x,
					y,
					team,
					temp: false,
					materializationSickness: sick,
				},
				game,
			);

		// Positions and sickness match the prepared pre-attack encounter.
		const headless = place('W4', 5, 4, 0);
		const upper = place('A2', 8, 3, 1);
		const lower = place('E3', 10, 5, 1, true);
		game.activeCreature = headless;
		const boomerang = headless.abilities[3];
		expect(boomerang.isUpgraded()).toBe(false);
		expect([upper.health, lower.health]).toEqual([100, 135]);
		expect(lower.size).toBeGreaterThan(1);
		expect(lower.effects).toHaveLength(0);

		// Select the ability and confirm a rightward choice via an empty upper-row hex.
		const query = jest.spyOn(game.grid, 'queryChoice');
		boomerang.query();
		const options = query.mock.calls[0][0] as {
			choices: Hex[][];
			fnOnConfirm: (hexes: Hex[]) => void;
		};
		const emptyHex = game.grid.hexes[3][6];
		expect(emptyHex.creature).toBeUndefined();
		const sweep = options.choices.find((choice) => choice.includes(emptyHex));
		expect(sweep).toBeDefined();
		expect(sweep.filter((hex) => hex.creature === lower).length).toBeGreaterThan(1);
		options.fnOnConfirm(sweep);
		await settle(game);

		expect(game.freezedInput).toBe(false);
		expect(upper.health).toBe(90);
		expect(lower.health).toBeLessThan(135);
	} finally {
		destroyHeadlessGame(game);
	}
});
