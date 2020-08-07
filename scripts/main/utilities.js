// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright © 2020 fvtt-lib-wrapper Rui Pinheiro

'use strict';

import {MODULE_ID} from '../consts.js';


// Debug
export let DEBUG = false;
export function setDebug(new_debug) { DEBUG = new_debug; }


// TYPES
export const TYPES_LIST = ['WRAPPER', 'MIXED', 'OVERRIDE'];
Object.freeze(TYPES_LIST);

export const TYPES = {
	WRAPPER : 1,
	MIXED   : 2,
	OVERRIDE: 3
};
Object.freeze(TYPES);

export const TYPES_REVERSE = {};
for(let key in TYPES) {
	TYPES_REVERSE[TYPES[key]] = key;
}
Object.freeze(TYPES_REVERSE);


// Already overridden Error type
export class AlreadyOverriddenError extends Error {
	constructor(module, target, conflicting_module, ...args) {
		super(`libWrapper: Failed to wrap '${target}' for module '${module}' with type OVERRIDE. The module '${conflicting_module}' has already registered an OVERRIDE wrapper for the same method.`, ...args);

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace)
			Error.captureStackTrace(this, AlreadyOverriddenError)

		this.name = 'AlreadyOverriddenError';

		// Custom debugging information
		this.module = module;
		this.target = target;
		this.conflicting_module = conflicting_module;
	}

	/**
	 * Returns the title of the module that caused the wrapping conflict
	 */
	get conflicting_module_title() {
		return game.modules.get(this.conflicting_module)?.data?.title;
	}
}


// Find currently executing module name (that is not libWrapper)
export function get_current_module_name() {
	const stack_trace = Error().stack;
	if(!stack_trace)
		return null;

	const full_matches = stack_trace.matchAll(/(?<=\/)modules\/.+(?=\/)/ig);
	if(!full_matches)
		return null;

	for(const full_match of full_matches) {
		const matches = full_match[0]?.split('/');
		if(!matches)
			continue;

		for(const match of matches) {
			if(!match || match == MODULE_ID || !game.modules.has(match))
				continue;

			return match;
		}
	}

	return null;
}