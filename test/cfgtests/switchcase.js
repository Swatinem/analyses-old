// should handle switch/case with fallthrough and break
/*
n0 [label="entry", style="rounded"]
n1 [label="case 1:"]
n2 [label="expr1;"]
n3 [label="expr12;"]
n4 [label="exit", style="rounded"]
n3 -> n4 []
n2 -> n3 []
n1 -> n2 [label="true"]
n5 [label="case 2:"]
n5 -> n3 [label="true"]
n6 [label="case 3:"]
n7 [label="expr34d;"]
n7 -> n4 []
n6 -> n7 [label="true"]
n8 [label="case 4:"]
n8 -> n7 [label="true"]
n9 [label="default:"]
n9 -> n7 []
n8 -> n9 [label="false"]
n6 -> n8 [label="false"]
n5 -> n6 [label="false"]
n1 -> n5 [label="false"]
n0 -> n1 []
*/

switch (e) {
	case 1:
		expr1;
	case 2:
		expr12;
		break;
	case 3:
	case 4:
	default:
		expr34d;
}
