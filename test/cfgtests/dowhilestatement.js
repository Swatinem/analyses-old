// should handle do-while loops
/*
n0 [label="entry", style="rounded"]
n1 [label="empty;"]
n2 [label="false"]
n2 -> n1 [label="true"]
n3 [label="exit", style="rounded"]
n2 -> n3 [label="false"]
n1 -> n2 []
n0 -> n1 []
*/
do {
	empty;
} while (false);
