// should handle basic finally
/*
n0 [label="entry", style="rounded"]
n1 [label="intry;"]
n2 [label="infinally;"]
n3 [label="exit", style="rounded"]
n2 -> n3 []
n1 -> n2 []
n0 -> n1 []
*/
try {
	intry;
} finally {
	infinally;
}
