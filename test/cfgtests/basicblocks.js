// should handle basic blocks and basic statements
/*
n0 [label="entry", style="rounded"]
n1 [label="statement1;"]
n2 [label="statement2;"]
n3 [label="a = 1 + 2;"]
n4 [label="block;"]
n5 [label="exit", style="rounded"]
n4 -> n5 []
n3 -> n4 []
n3 -> n5 [color="red", label="exception"]
n2 -> n3 []
n1 -> n2 []
n0 -> n1 []
*/

statement1;
;
statement2;
a = 1 + 2;
{
	block;
}
