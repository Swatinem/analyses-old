// should skip declarations
/*
n0 [label="entry", style="rounded"]
n1 [label="statement1;"]
n2 [label="statement2;"]
n3 [label="exit", style="rounded"]
n2 -> n3 []
n1 -> n2 []
n0 -> n1 []
*/
statement1;
function f() {}
statement2;
