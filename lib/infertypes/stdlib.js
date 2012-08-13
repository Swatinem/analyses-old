var value = require('./value');
var Value = value.Value;
var Reference = value.Reference;
//var findVariables = require('../findvariables');

module.exports = function (evaluate, filename) {
var exports = {};

exports.stdlib = {};

// Object.prototype
var ObjectProto = new Value();

var newObject = function () {
	var val = new Value({
		typeof: 'object',
		proto: ObjectProto
	});
	return new Reference(val);
};

// Function.prototype
var FunctionProto = new Value({proto: ObjectProto});

// every function will get a prototype chain of Function -> Object
var FunctionValue = function (evalFunc) {
	var val = new Value({
		typeof: 'function',
		evalFunc: evalFunc,
		proto: FunctionProto
	});
	return val;
}

// String.prototype
var StringProto = new Value({proto: ObjectProto});

// this represents a primitive string that has the prototype `String`
var newString = function (knownvalue) {
	var val = new Value({
		typeof: 'string',
		proto: StringProto,
		knownvalue: knownvalue
	});
	return new Reference(val);
}

// Number.prototype
var NumberProto = new Value({proto: ObjectProto});

var newNumber = function (knownvalue) {
	var val = new Value({
		typeof: 'number',
		proto: NumberProto,
		knownvalue: knownvalue
	});
	return new Reference(val);
}

// Boolean.prototype
var BooleanProto = new Value({proto: ObjectProto});

var newBoolean = function (knownvalue) {
	var val = new Value({
		typeof: 'boolean',
		proto: BooleanProto,
		knownvalue: knownvalue
	});
	return new Reference(val);
}

// Array.prototype
var ArrayProto = new Value({proto: ObjectProto});

var newArray = function () {
	var val = new Value({
		typeof: 'object',
		proto: ArrayProto
	});
	val.set('length', newNumber());
	return new Reference(val);
};

// RegExp.prototype
var RegExpProto = new Value({proto: ObjectProto});

var newRegExp = function () {
	var val = new Value({
		typeof: 'object',
		proto: RegExpProto
	});
	val.set('global', newBoolean());
	val.set('ignoreCase', newBoolean());
	val.set('multiline', newBoolean());
	val.set('lastIndex', newNumber());
	val.set('source', newString());
	return new Reference(val);
};


// Object
exports.stdlib.Object = new Reference(FunctionValue(newObject));
exports.stdlib.Object[0].set('prototype', ObjectProto);

// Object.prototype methods
function returnThis(thisVal, argVals) {
	return new Reference(thisVal);
}
ObjectProto.set('valueOf', FunctionValue(returnThis));
ObjectProto.set('toString', FunctionValue(newString));
ObjectProto.set('hasOwnProperty', FunctionValue(newBoolean));
ObjectProto.set('constructor', exports.stdlib.Object);

// Function
exports.stdlib.Function = new Reference(FunctionValue(function () {
	return new Reference(FunctionValue(function () { return new Reference(); }));
}));
exports.stdlib.Function[0].set('prototype', FunctionProto);

// Function.prototype
FunctionProto.set('call', FunctionValue(function (thisVal, argVals) {
	var retVal = {retVal: new Reference(), throwVal: new Reference()};
	var newThis = argVals.shift();
	thisVal.forEach(function (fun) {
		var functionReturn = fun.evaluateCall(newThis, argVals);
		retVal.retVal.assign(functionReturn.retVal);
		retVal.throwVal.assign(functionReturn.throwVal);
	});
	return retVal;
}));
FunctionProto.set('apply', FunctionValue(function (thisVal, argVals) {
	var retVal = {retVal: new Reference(), throwVal: new Reference()};
	var newThis = argVals.shift();
	var newArgs = [];
	if (argVals.length && argVals[0].length == 1) {
		// enumerate all the number properties
		// FIXME: there should be a `Value` method for this
		var props = argVals[0][0].properties;
		for (var prop in props) {
			if (parseInt(prop) == prop.substring(0, prop.length - 1))
				newArgs.push(props[prop]);
		}
	}
	thisVal.forEach(function (fun) {
		var functionReturn = fun.evaluateCall(newThis, newArgs);
		retVal.retVal.assign(functionReturn.retVal);
		retVal.throwVal.assign(functionReturn.throwVal);
	});
	return retVal;
}));

// Function.prototype.prototype
FunctionProto.set('constructor', exports.stdlib.Function);
FunctionProto.set('prototype', ObjectProto);

// String.prototype methods
StringProto.set('valueOf', FunctionValue(newString));
StringProto.set('substring', FunctionValue(newString));
StringProto.set('substr', FunctionValue(newString));
StringProto.set('replace', FunctionValue(newString));
StringProto.set('slice', FunctionValue(newString));
StringProto.set('toLowerCase', FunctionValue(newString));
StringProto.set('toUpperCase', FunctionValue(newString));
StringProto.set('charCodeAt', FunctionValue(newNumber));
StringProto.set('charAt', FunctionValue(newString));
StringProto.set('indexOf', FunctionValue(newNumber));
StringProto.set('lastIndexOf', FunctionValue(newNumber));
StringProto.set('match', FunctionValue(function (thisVal, argVals) {
	var arr = newArray();
	arr[0].setGeneric(newString(), 'number');
	return arr;
}));
StringProto.set('split', FunctionValue(function (thisVal, argVals) {
	var arr = newArray();
	arr[0].setGeneric(newString(), 'number');
	return arr;
}));

// String
exports.stdlib.String = new Reference(FunctionValue(newString));
exports.stdlib.String[0].set('prototype', StringProto);
StringProto.set('constructor', exports.stdlib.String);
exports.stdlib.String[0].set('fromCharCode', FunctionValue(newString));

// Number.prototype methods
NumberProto.set('valueOf', FunctionValue(newNumber));

// Number
exports.stdlib.Number = new Reference(FunctionValue(newNumber));
exports.stdlib.Number[0].set('prototype', NumberProto);
NumberProto.set('constructor', exports.stdlib.Number);

// Boolean.prototype methods
BooleanProto.set('valueOf', FunctionValue(newBoolean));

// Boolean
exports.stdlib.Boolean = new Reference(FunctionValue(newBoolean));
exports.stdlib.Boolean[0].set('prototype', BooleanProto);
BooleanProto.set('constructor', exports.stdlib.Boolean);

// Array.prototype methods
ArrayProto.set('join', FunctionValue(newString));
ArrayProto.set('sort', FunctionValue(returnThis));
ArrayProto.set('slice', FunctionValue(returnThis));
ArrayProto.set('splice', FunctionValue(returnThis));
function setGenericElem(thisVal, argVals) {
	var val = new Reference();
	argVals.forEach(function (arg) { val.assign(arg); });
	thisVal.forEach(function (thisVal) {
		thisVal.setGeneric(val, 'number');
	});
	return newNumber();
}
function getGenericElem(thisVal, argVals) {
	var val = new Reference();
	thisVal.forEach(function (thisVal) {
		val.assign(thisVal.getGeneric('number'));
	});
	return val;
}
ArrayProto.set('push', FunctionValue(setGenericElem));
ArrayProto.set('unshift', FunctionValue(setGenericElem));
ArrayProto.set('shift', FunctionValue(getGenericElem));
ArrayProto.set('pop', FunctionValue(getGenericElem));
ArrayProto.set('concat', FunctionValue(function (thisVal, argVals) {
	var arr = newArray();
	// FIXME: this modifies the original array, that should not be the case
	thisVal.forEach(function (thisVal) {
		arr[0].setGeneric(thisVal.getGeneric('number'), 'number');
	});
	argVals.forEach(function (arg) {
		arg.forEach(function (arg) {
			if (arg.typeof !== 'object')
				return arr[0].setGeneric(arg, 'number');
			// else: the arg is an array itself
			arr[0].setGeneric(arg.getGeneric('number'), 'number');
		});
	});
	return arr;
}));

// Array
exports.stdlib.Array = new Reference(FunctionValue(function (thisVal, argVals, type) {
	var arr = (type === 'NewExpression') ? thisVal : newArray();
	// thisVal may not have a length yet
	arr[0].set('length', newNumber());
	if (argVals.length > 1) {
		for (var i in argVals) {
			arr[0].set(i, argVals[i]);
		}
	}
	return arr;
}));
exports.stdlib.Array[0].set('prototype', ArrayProto);
ArrayProto.set('constructor', exports.stdlib.Array);


// RegExp.prototype methods
RegExpProto.set('exec', FunctionValue(function (thisVal, argVals) {
	var arr = newArray();
	arr[0].setGeneric(newString(), 'number');
	return arr;
}));
RegExpProto.set('test', FunctionValue(newBoolean));

// RegExp
exports.stdlib.RegExp = new Reference(FunctionValue(newRegExp));
exports.stdlib.RegExp[0].set('prototype', RegExpProto);
RegExpProto.set('constructor', exports.stdlib.RegExp);


// Date.prototype
var DateProto = new Value({proto: ObjectProto});

DateProto.set('getDate', FunctionValue(newNumber));
DateProto.set('getDay', FunctionValue(newNumber));
DateProto.set('getFullYear', FunctionValue(newNumber));
DateProto.set('getHours', FunctionValue(newNumber));
DateProto.set('getMilliseconds', FunctionValue(newNumber));
DateProto.set('getMinutes', FunctionValue(newNumber));
DateProto.set('getMonth', FunctionValue(newNumber));
DateProto.set('getSeconds', FunctionValue(newNumber));
DateProto.set('getTime', FunctionValue(newNumber));
DateProto.set('getTimezoneOffset', FunctionValue(newNumber));
DateProto.set('getYear', FunctionValue(newNumber));
DateProto.set('setTime', FunctionValue(newNumber));
DateProto.set('valueOf', FunctionValue(newNumber));

// Date
exports.stdlib.Date = new Reference(FunctionValue(function () {
	var val = new Value({
		typeof: 'object',
		proto: DateProto
	});
	return new Reference(val);
}));
exports.stdlib.Date[0].set('prototype', DateProto);
DateProto.set('constructor', exports.stdlib.Date);

// Math
exports.stdlib.Math = new Reference(new Value({typeof: 'object', proto: ObjectProto}));
var MathObj = exports.stdlib.Math[0];
MathObj.set('E', newNumber());
MathObj.set('LN10', newNumber());
MathObj.set('LN2', newNumber());
MathObj.set('LOG10E', newNumber());
MathObj.set('LOG2E', newNumber());
MathObj.set('PI', newNumber());
MathObj.set('SQRT1_2', newNumber());
MathObj.set('SQRT2', newNumber());
MathObj.set('abs', FunctionValue(newNumber));
MathObj.set('acos', FunctionValue(newNumber));
MathObj.set('asin', FunctionValue(newNumber));
MathObj.set('atan', FunctionValue(newNumber));
MathObj.set('atan2', FunctionValue(newNumber));
MathObj.set('ceil', FunctionValue(newNumber));
MathObj.set('cos', FunctionValue(newNumber));
MathObj.set('exp', FunctionValue(newNumber));
MathObj.set('floor', FunctionValue(newNumber));
MathObj.set('log', FunctionValue(newNumber));
MathObj.set('max', FunctionValue(newNumber));
MathObj.set('min', FunctionValue(newNumber));
MathObj.set('pow', FunctionValue(newNumber));
MathObj.set('random', FunctionValue(newNumber));
MathObj.set('round', FunctionValue(newNumber));
MathObj.set('sin', FunctionValue(newNumber));
MathObj.set('sqrt', FunctionValue(newNumber));
MathObj.set('tan', FunctionValue(newNumber));

// Error.prototype
var ErrorProto = new Value({proto: ObjectProto});
ErrorProto.set('name', newString());

// Error
var errorFunc = function (thisVal, argVals) {
	// called with new
	thisVal[0].set('message', newString());
	return thisVal;
}
exports.stdlib.Error = new Reference(FunctionValue(errorFunc));
exports.stdlib.Error[0].set('prototype', ErrorProto);
ErrorProto.set('constructor', exports.stdlib.Error);

// SyntaxError.prototype
var SyntaxErrorProto = new Value({proto: ErrorProto});

// SyntaxError
exports.stdlib.SyntaxError = new Reference(FunctionValue(errorFunc));
exports.stdlib.SyntaxError[0].set('prototype', SyntaxErrorProto);
SyntaxErrorProto.set('constructor', exports.stdlib.SyntaxError);


// TODO: JSON, array extras, object extras, …


exports.newString = newString;
exports.newNumber = newNumber;
exports.newBoolean = newBoolean;
exports.newFunction = function (func) { return new Reference(FunctionValue(func)); };
exports.newObject = newObject;
exports.newArray = newArray;
exports.newRegExp = newRegExp;

exports.stdlib.Infinity = newNumber();
exports.stdlib.NaN = newNumber();
exports.stdlib.undefined = new Reference(/*new Value()*/);
exports.stdlib.parseInt = exports.newFunction(newNumber);
exports.stdlib.parseFloat = exports.newFunction(newNumber);
exports.stdlib.isNaN = exports.newFunction(newBoolean);
exports.stdlib.isFinite = exports.newFunction(newBoolean);

function callFirstArg(thisVal, argVals) {
	var funs = argVals[0];
	funs.forEach(function (fun) {
		fun.evaluateCall(thisVal, []);
	});
	return {};
}

exports.stdlib.setTimeout = exports.newFunction(callFirstArg);
exports.stdlib.setInterval = exports.newFunction(callFirstArg);
exports.stdlib.clearTimeout = exports.newFunction();
exports.stdlib.clearInterval = exports.newFunction();

var fs = require('fs')
  , path = require('path')
  , esprima = require('esprima');

var requireCache = {};

var tryExt = ['', '.js', '/index.js'];
// TODO: move this to own file and make it possible to use different stdlibs
exports.stdlib.require = exports.newFunction(function (thisVal, argVals) {
	if (!argVals[0] || argVals[0].length > 1 || argVals[0][0].typeof !== 'string' ||
	    typeof argVals[0][0].knownvalue === 'undefined')
		return new Reference();
	var moduleName = argVals[0][0].knownvalue;
	var dir = path.dirname(filename || process.cwd());
	
	var contents, realFile;
	function checkDir(dir) {
		tryExt.some(function (ext) {
			var file = path.join(dir, moduleName + ext);
			if (path.existsSync(file)) {
				try {
					contents = fs.readFileSync(file, 'utf8');
					realFile = file;
					return true;
				} catch (e) {}
			}
		});
	}
	// relative module path
	if (moduleName[0] === '.') {
		checkDir(dir);
	} else {
		while (!realFile) {
			checkDir(path.join(dir, 'node_modules'));
			dir = path.dirname(dir);
			if (dir === '/') {
				break;
			}
		}
	}
	
	if (realFile in requireCache)
		return requireCache[realFile];
	
	if (!realFile)
		return new Reference();
	
	var ast = esprima.parse(contents);
	ast.filename = realFile;
	// populate the scope for the ast
	//findVariables(ast);
	
	var parentFrame = {vars: {}};
	for (var key in exports.stdlib) {
		parentFrame.vars[key + '-'] = exports.stdlib[key];
	}
	var frame = {vars: {}, parent: parentFrame};
	var moduleobj = newObject();
	var exportsobj = newObject();
	moduleobj[0].set('exports', exportsobj);
	frame.vars['module-'] = moduleobj;
	frame.vars['exports-'] = exportsobj;
	
	var oldFilename = filename;
	filename = realFile;
	evaluate(ast, frame);
	filename = oldFilename;
	
	var moduleExports = frame.vars['module-'][0].get('exports');

	//console.log(ast, contents, moduleExports);
	// XXX: need a better way to override module.exports
	requireCache[realFile] = new Reference(moduleExports[1] || moduleExports[0]);
	return requireCache[realFile];
});

return exports;
};
