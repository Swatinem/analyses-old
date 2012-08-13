exports.UniqueQueue = UniqueQueue;
exports.Set = Set;

/**
 * A queque that makes sure that `push`ed elements are never duplicated
 */
function UniqueQueue() {
	Array.call(this);
}
UniqueQueue.prototype = new Array();
UniqueQueue.prototype.push = function (elem) {
	var pos = this.indexOf(elem);
	if (pos != -1)
		this.splice(pos, 1);
	Array.prototype.push.call(this, elem);
};

/**
 * This is a general Set that can `union` and `intersect` with another Set
 * and uses the `equals` function of elements if they have one.
 * Other methods include `contains` and `equals`.
 */
function Set(init) {
	Array.call(this);
	if (init) {
		var self = this;
		init.forEach(function (elem) {
			self.push(elem);
		});
	}
}
Set.prototype = new Array();
Set.prototype.union = function (other) {
	var self = this;
	other.forEach(function (elem) {
		if (!self.contains(elem))
			self.push(elem);
	});
	return this;
};
Set.prototype.intersect = function (other) {
	for (var i = 0; i < this.length; i++) {
		if (!other.contains(this[i])) {
			this.splice(i, 1);
			i--;
		}
	}
	return this;
};
Set.prototype.contains = function (elem) {
	return this.some(function (elemB) {
		return elem == elemB || elem.equals && elem.equals(elemB);
	});
};
Set.prototype.equals = function (other) {
	if (other.length != this.length)
		return false;
	return this.every(function (elem) {
		return other.contains(elem);
	});
};
