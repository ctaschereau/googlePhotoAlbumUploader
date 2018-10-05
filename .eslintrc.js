module.exports = {
	"extends" : "eslint:recommended",
	"parserOptions" : {
		"ecmaVersion" : 2017
	},
	"env": {
		"es6": true,
		"node": true
	},
	"rules" : {
		"no-console" : 0,
		"indent" : [
			"warn",
			"tab",
			{"SwitchCase" : 1}
		],
		"max-depth" : [
			"warn",
			5
		],
		"no-useless-escape" : [
			"off"
		],
		"no-extra-boolean-cast" : [
			"warn"
		],
		"no-unused-vars" : [
			"warn", {
				"vars" : "all",
				"args" : "none",
				"ignoreRestSiblings" : false
			}
		],
		"quotes" : [
			"off",
			"single"
		],
		"semi" : [
			"error",
			"always"
		],
		"valid-jsdoc" : ["warn", {
			"requireParamDescription" : false,
			"requireReturnDescription" : false,
			"requireReturn" : false
		}]
	}
};