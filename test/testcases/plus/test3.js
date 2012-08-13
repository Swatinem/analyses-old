// should infer string or number if one arg is either string or number
//<number | string>
var strnum = 10 || "str";
var actual = 1 + strnum;
