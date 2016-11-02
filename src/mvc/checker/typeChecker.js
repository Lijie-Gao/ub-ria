/**
 * UB RIA Base
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 类型校验对象
 * @author yanghuabei(yanghuabei@baidu.com)
 */
define(
    function (require) {
        var u = require('../../util');
        var checker = {
            name: 'type',
            errorMessage: '${title}的类型不符合要求',
            priority: 10,
            check: check
        };


        /**
         * 类型检验器，value值为undefined、null时，不做检查；
         * enum、number类型字段值为number时通过检查；
         *
         * @param {string | boolean | number | Object | Array | undefined} value 待检验的值
         * @param {Array} schema 字段的定义、约束, 长度为3或2的数组
         * @return {boolean} 检验成功返回true，失败返回false
         */
        function check(value, schema) {
            var expectedType = schema[0];
            // typeMapping的key为值类型，value为与key匹配的定义中的类型数组
            var typeMapping = {
                Undefined: true,
                Null: true,
                Array: ['array'],
                String: ['string'],
                Number: ['number', 'enum'],
                Boolean: ['bool'],
                Object: ['object']
            };
            var key = '';

            // ie8下Object.prototype.toString.call(null/undefined)返回的是[Object Object]
            // 所以这里单独处理null和undefined
            if (value === null) {
                key = 'Null';
            }
            else if (value === undefined) {
                key = 'Undefined';
            }
            else {
                key = Object.prototype.toString.call(value);
                key = key.substring(8, key.length - 1);
            }

            return typeMapping[key] === true || u.indexOf(typeMapping[key], expectedType) >= 0;
        }

        return checker;
    }
);
