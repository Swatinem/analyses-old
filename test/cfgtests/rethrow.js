// should handle try/catch with rethrow
/*
n0 [label="entry", style="rounded"]
n1 [label="statement;"]
n2 [label="throw e;"]
n3 [label="catch (e) {\n    rethrow;\n    throw e;\n}"]
n4 [label="rethrow;"]
n5 [label="throw e;"]
n6 [label="exit", style="rounded"]
n5 -> n6 [color="red", label="exception"]
n4 -> n5 []
n3 -> n4 []
n2 -> n3 [color="red", label="exception"]
n1 -> n2 []
n0 -> n1 []
*/
try {
	statement;
	throw e;
} catch (e) {
	rethrow;
	throw e;
}
