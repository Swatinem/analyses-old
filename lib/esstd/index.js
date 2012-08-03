module.exports = GlobalContext;

function GlobalContext(astNode, typeInference) {
	// initialize the dynamic objects
	var self = this;
	for (var k in dynamics) {
		//console.log(k, dynamics);
		self[k] = dynamics[k].bind(self, self);
	}

	// 10.4.1.1
	var globalObject = new this.ObjectValue();
	var globalEnvironment = this.NewObjectEnvironment(globalObject, undefined);
	
	// TODO: initialize builtin objects

	var context = new this.ExecutionContext(globalEnvironment, globalEnvironment, globalObject, globalObject);
	//context.global = true; // FIXME?
	this.context = context;
	//this.globalObject = globalObject;
	//this.globalEnvironment = globalEnvironment;
	this.typeInference = typeInference;
	
	// 10.5
	this.DeclarationBinding(astNode, context, undefined);
}

/**
 * This is a hack to make sure certain functions have access to global state
 * and to avoid a lot of require mess.
 */
var dynamics = {};

[
	require('./binding'),
	require('./conversion'),
	require('./environment'),
	require('./reference'),
	require('./value')
].forEach(function (ex) {
	for (var k in ex) {
		if (k === 'dynamic') {
			for (var dk in ex.dynamic) {
				dynamics[dk] = ex.dynamic[dk];
			}
			continue;
		}
		var p = ex[k];
		//if (typeof p === 'function')
		//	p = p.bind(GlobalContext.prototype);
		GlobalContext.prototype[k] = p;
	}
});
