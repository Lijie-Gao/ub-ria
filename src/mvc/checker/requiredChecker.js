/**
 * UB RIA Base
 * Copyright 2014 Baidu Inc. All rights reserved.
 *
 * @file 必填字段校验器
 * @author yanghuabei(yanghuabei@baidu.com)
 */
define(
    function (require) {
        var u = require('../../util');
        var checker = {
            name: 'required',
            errorMessage: '${title}不能为空',
            priority: 1,
            check: check
        };

        /**
         * required检验器
         * 检验逻辑：undefined, null, {}, [], ''均无法通过校验
         *
         * @param {string | boolean | number | Object | Array | undefined} value 输入的值
         * @param {Array} schema 字段的定义、约束, 长度为3的数组
         * @return {boolean} 检验成功返回true，失败返回false
         */
        function check(value, schema) {
            return !u.isEmpty(value) || u.isNumber(value) || u.isBoolean(value);
        }

        return checker;
    }
);
