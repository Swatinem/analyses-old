// should handle while loops
/*
n0 [label="entry", style="rounded"]
n1 [label="true"]
n2 [label="empty;"]
n2 -> n1 []
n1 -> n2 [label="true"]
n3 [label="exit", style="rounded"]
n1 -> n3 [label="false"]
n0 -> n1 []
*/
while (true) {
	empty;
}
