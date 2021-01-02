// SPDX-License-Identifier: LGPL-3.0-or-later
// Copyright © 2020 fvtt-lib-wrapper Rui Pinheiro

'use strict';


import test from 'tape';
import {wrap_front, unwrap_all_from_obj, async_retval} from './utilities.js';
import '../src/main/lib-wrapper.js';


function setup() {
	libWrapper._unwrap_all();

	game.modules.clear();
	global.A = undefined;
}



test('Wrapper Async: Basic functionality', async function (t) {
	setup();

	class A {
		x() {
			return async_retval(1);
		}
	}


	let originalValue = 1;
	let a = new A();
	t.equal(await a.x(), originalValue, 'Original');


	wrap_front(A.prototype, 'x', async function(original) {
		t.equal(await original(), originalValue, 'xWrapper 1');
		return 10;
	});
	t.equal(await a.x(), 10, "Wrapped with 10");


	wrap_front(A.prototype, 'x', async function(original) {
		const res = await async_retval(20);
		t.equal(await original(), 10, 'xWrapper 2');
		return res;
	});
	t.equal(await a.x(), 20, "Wrapped with 20");


	A.prototype.x = function() {
		return async_retval(2);
	}
	originalValue = 2;
	t.equal(await a.x(), 20, "Replaced with 2");


	wrap_front(A.prototype, 'x', async function(original) {
		const res = await async_retval(10);
		t.equal(await original(), 20, 'xWrapper 3');
		return 30;
	});
	t.equal(await a.x(), 30, "Wrapped with 30");


	A.prototype.x = function() {
		return async_retval(3);
	}
	originalValue = 3;
	t.equal(await a.x(), 30, "Replaced with 3");


	// Done
	t.end();
});



test('Wrapper Async: Parameters', async function(t) {
	setup();

	class A {
		y(ret=1) {
			return async_retval(ret);
		}
	}


	let originalValue = 1;
	let a = new A();
	t.equal(await a.y(), originalValue, 'Original');
	t.equal(await a.y(100), 100, 'Original(100)');


	wrap_front(A.prototype, 'y', async function(original, ret=originalValue) {
		t.equal(await original(ret), ret, 'yWrapper 1');
		return 1000;
	});

	t.equal(await a.y( ), 1000, "Wrapped (1)");
	t.equal(await a.y(3), 1000, "Wrapped (2)");
	t.equal(await a.y(5), 1000, "Wrapped (3)");


	// Done
	t.end();
});



test('Wrapper Async: Prototype redirection', async function(t) {
	setup();

	class A {
		z(y) {
			return async_retval(y);
		}
	}


	let originalValue = 1;
	let a = new A();
	t.equal(await a.z(1), originalValue, 'Original');


	// Wrap normally first
	wrap_front(A.prototype, 'z', async function(original, ...args) {
		t.equal(await original.apply(this, args), originalValue, 'zWrapper 1');
		return 100;
	});
	t.equal(await a.z(1), 100, "Wrapped with 100");


	// Wrap in the traditional way, by modifying prototype
	let wrappedValue = 1;
	A.prototype.z = (function() {
		let original = A.prototype.z;

		return async function() {
			t.equal(await original.apply(this, arguments), wrappedValue, 'Prototype Wrapper 1');
			return 2;
		};
	})();
	originalValue = 2;


	// Confirm it's working properly
	t.equal(await a.z(1), 100, "Wrapped with prototype (1)");
	wrappedValue = 2;
	t.equal(await a.z(2), 100, "Wrapped with prototype (2)");


	// Done
	t.end();
});



test('Wrapper: Replace on instance', async function(t) {
	setup();


	class A {
		x() {
			return async_retval(1);
		}
	}


	let a = new A();
	t.equal(await a.x(), 1, 'Original');


	// Create a normal wrapper
	let wrapper1_value = 1;
	wrap_front(A.prototype, 'x', async function(original) {
		const result = await original();
		t.equal(result, wrapper1_value, 'xWrapper 1');
		return result + 1;
	});
	t.equal(await a.x(), 2, "Wrapped with 10");


	// Assign directly to a, not to A.prototype
	a.x = function() { return async_retval(20); };
	wrapper1_value = 20;
	t.equal(await a.x(), 21, 'Instance assign #1');


	// Calling another instance should return the old value
	let b = new A();
	wrapper1_value = 1;
	t.equal(await b.x(), 2, 'Instance assign #2');


	// Use a manual wrapper of the instance instead
	const instancewrapper_value = 1;
	wrapper1_value = 2;
	const b_original = b.x;
	b.x = async function() {
		const result = await b_original();
		t.equal(result, instancewrapper_value, 'Instance manual wrapper #1');
		return result + 1;
	};
	t.equal(await b.x(), 3, 'Instance manual wrapper call');


	// Done
	t.end();
});



test('Wrapper Async: Inherited Class', async function(t) {
	setup();

	class B {
		x() {
			return async_retval(1);
		}
	}

	class A extends B {
	}

	class C extends B {
	}

	let originalValue = 1;
	let a = new A();
	t.equal(await a.x(), originalValue, 'Original');

	wrap_front(a, 'x', async function(original) {
		t.equal(await original(), originalValue, 'xWrapper 1');
		return 10;
	});
	t.equal(await a.x(), 10, "Wrapped with 10");


	// Assign directly to a, not to A.prototype
	a.x = function() {
		return async_retval(20);
	};
	originalValue = 20;
	t.equal(await a.x(), 10, 'Instance assign #1');


	// Calling another instance should return the old value
	let a2 = new A();
	t.equal(await a2.x(), 1, 'Instance assign #2');


	// Overriding C's prototype will wrap 'undefined'
	let originalValue2 = 1;
	wrap_front(C.prototype, 'x', async function(original) {
		t.equal(await original(), originalValue2, 'xWrapper 2');
		return 8;
	});
	let c = new C();
	t.equal(await c.x(), 8, "Wrapped with 8");


	// Overriding B's prototype will work
	wrap_front(B.prototype, 'x', async function(original) {
		t.equal(await original(), originalValue2, 'xWrapper 3');
		return 5;
	});
	originalValue = 5;
	t.equal(await a2.x(), 5, "Wrapped with 5");


	// Overriding A's prototype will use B's wrapper
	wrap_front(A.prototype, 'x', async function(original) {
		t.equal(await original(), originalValue, 'xWrapper 4');
		return 7;
	});
	t.equal(await a2.x(), 7, "Wrapped with 7");


	// Done
	t.end();
});