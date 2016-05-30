/**
 * UB RIA Base
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file tpl加载插件
 * @author otakustay
 */

import u from './util';
import ajax from 'er/ajax';
import etpl from 'etpl';

// 添加一堆`filter`用用
etpl.addFilter('trim', s => s.trim());
etpl.addFilter('pascalize', u.pascalize);
etpl.addFilter('camelize', u.camelize);
etpl.addFilter('dasherize', u.dasherize);
etpl.addFilter('constlize', u.constlize);
etpl.addFilter('pluralize', u.pluralize);

let controlModulePrefix = {
    // Sidebar不使用esui的，那个不大符合要求
    BoxGroup: 'esui',
    Button: 'esui',
    Calendar: 'esui',
    CheckBox: 'esui',
    CommandMenu: 'esui',
    Crumb: 'esui',
    Dialog: 'esui',
    Form: 'esui',
    Frame: 'esui',
    Label: 'esui',
    Link: 'esui',
    MonthView: 'esui',
    Pager: 'esui',
    Panel: 'esui',
    RangeCalendar: 'esui',
    Region: 'esui',
    RichCalendar: 'esui',
    Schedule: 'esui',
    SearchBox: 'esui',
    Select: 'esui',
    Tab: 'esui',
    Table: 'esui',
    TextBox: 'esui',
    TextLine: 'esui',
    Tip: 'esui',
    TipLayer: 'esui',
    Tree: 'esui',
    Validity: 'esui',
    Wizard: 'esui',
    ActionPanel: 'ef',
    ActionDialog: 'ef',
    ViewPanel: 'ef',
    TogglePanel: 'ub-ria-ui',
    RichSelector: 'ub-ria-ui/selectors',
    TableRichSelector: 'ub-ria-ui/selectors',
    ToggleSelector: 'ub-ria-ui/selectors',
    TreeRichSelector: 'ub-ria-ui/selectors',
    Warn: 'ub-ria/ui/warn'
};

let extensionModulePrefix = {
    AutoSort: 'esui/extension',
    Command: 'esui/extension',
    CustomData: 'esui/extension',
    TableEdit: 'esui/extension',
    TableSubrow: 'esui/extension',
    AutoSubmit: 'ub-ria/ui/extension',
    ExternSearch: 'ub-ria/ui/extension',
    ExternSelect: 'ub-ria/ui/extension',
    TrimInput: 'ub-ria/ui/extension',
    WordCount: 'ub-ria/ui/extension'
};

/**
 * 获取控件依赖关系
 *
 * @param {string} text 模板内容
 * @return {Set.<string>} 依赖的控件列表
 */
function getControlDependencies(text) {
    let dependencies = new Set();

    let regex = /<\s*esui-([\w-]+)[^>]*>|data-ui-type="(\w+)"/g;
    let match = regex.exec(text);
    while (match) {
        let type = match[1] && u.pascalize(match[1]) || match[2];
        let prefix = (controlModulePrefix[type] || 'ui') + '/';
        dependencies.add(prefix + type);

        match = regex.exec(text);
    }

    return dependencies;
}

/**
 * 获取扩展依赖关系
 *
 * @param {string} text 模板内容
 * @return {Set.<string>} 依赖的扩展列表
 */
function getExtensionDependencies(text) {
    let dependencies = new Set();

    let regex = /data-ui-extension-[^-]+-type="(\w+)"/g;
    let match = regex.exec(text);
    while (match) {
        let type = match[1];
        let prefix = (extensionModulePrefix[type] || 'ui/extension') + '/';
        dependencies.add(prefix + type);

        match = regex.exec(text);
    }

    return dependencies;
}

/**
 * 模板加载插件，类似[etpl](https://github.com/ecomfe/etpl)的AMD插件，
 * 但此插件会分析模板的源码，当模板按标准书写时，可自动分析控件的依赖
 *
 * 使用此插件的自动控件依赖分析功能，模板必须满足以下条件：
 *
 * - 控件的HTML必须写`data-ui-type="SomeControl"`这一格式，即*不能*有`data-ui="type: SomeControl"`这样的写法
 * - 对于非ESUI、EF框架，且不在`src/ui`文件夹下的控件，必须通过{@link tpl.registerControl}方法注册模块前缀
 * - 对于ESUI扩展，必须写`data-ui-extension-xxx-type="Xxx"`的形式
 * - 业务ESUI扩展必须放置在`src/ui/extension`文件夹下
 *
 * @namespace tpl
 */

/**
 * 加载模板，AMD插件对象暴露的方法
 *
 * @method tpl.load
 * @param {string} resourceId 模板资源id
 * @param {Function} parentRequire 父级`require`函数
 * @param {Function} load 加载完成后调用
 */
export function load(resourceId, parentRequire, load) {
    let addTemplate = text => {
        etpl.parse(text);

        let dependencies = [...getControlDependencies(text), ...getExtensionDependencies(text)];

        window.require(dependencies, () => load(text));
    };

    if (resourceId.indexOf('.tpl.html') >= 0) {
        let options = {
            method: 'GET',
            url: parentRequire.toUrl(resourceId),
            cache: true,
            dataType: 'text'
        };
        ajax.request(options).then(addTemplate);
    }
    else {
        parentRequire([resourceId], addTemplate);
    }
}

/**
 * 注册业务控件的模块
 *
 * @method tpl.registerControl
 * @param {string} moduleId 业务控件对应的模块id，必须为顶级id
 */
export function registerControl(moduleId) {
    let lastIndexOfSlash = moduleId.lastIndexOf('/');
    let prefix = moduleId.substring(0, lastIndexOfSlash);
    let type = moduleId.substring(lastIndexOfSlash + 1);
    controlModulePrefix[type] = prefix;
}

/**
 * 注册业务控件扩展的模块
 *
 * @method tpl.registerExtension
 * @param {string} moduleId 业务控件对应的模块id，必须为顶级id
 */
export function registerExtension(moduleId) {
    let lastIndexOfSlash = moduleId.lastIndexOf('/');
    let prefix = moduleId.substring(0, lastIndexOfSlash);
    let type = moduleId.substring(lastIndexOfSlash + 1);
    extensionModulePrefix[type] = prefix;
}
