/**
 * UB RIA Base
 * Copyright 2015 Baidu Inc. All rights reserved.
 *
 * @file 列表Action基类
 * @author otakustay
 */

import u from '../../util';
import URL from 'er/URL';
import {accessorProperty} from '../../decorator';
import {viewEvent} from '../decorator';
import BaseAction from '../common/BaseAction';

/**
 * 列表Action基类
 *
 * @class mvc.ListAction
 * @extends mvc.BaseAction
 */
@accessorProperty('layoutChangeNotifier')
export default class ListAction extends BaseAction {
    get category() {
        return 'list';
    }

    /**
     * 进行查询
     *
     * @protected
     * @method mvc.ListAction#performSearch
     */
    performSearch() {
        let event = this.fire('search');
        if (!event.isDefaultPrevented()) {
            let query = this.getSearchQuery();
            query.page = 1;
            this.reloadWithQueryUpdate(query);
        }
    }

    /**
     * 获取查询条件
     *
     * @protected
     * @method mvc.ListAction#getSearchQuery
     * @return {Object} 查询条件
     */
    getSearchQuery() {
        let query = this.view.getSearchArgs();
        query.page = this.view.getPageIndex();

        return query;
    }

    /**
     * 页码更新后重新加载操作
     *
     * @protected
     * @method mvc.ListAction#reloadWithQueryUpdate
     * @param {Object} args 新的请求参数对象
     */
    reloadWithQueryUpdate(args) {
        let url = this.context.url;
        // url中会有一些不实查询产生的参数（比如跳转过来时就带着的，这些要保留下来）
        let urlArgs = url.getQuery();
        // 如果跟默认的参数相同，去掉默认字段
        let defaultArgs = this.model.defaultArgs;
        let query = u.purify(Object.assign({}, urlArgs, args), defaultArgs);

        let path = url.getPath();
        url = URL.withQuery(path, query).toString();
        this.redirect(url, {force: true});
    }

    /**
     * 修改实体状态
     *
     * @protected
     * @method mvc.ListAction#modifyStatus
     * @param {Object[]} items 待修改状态的实体数组
     * @param {number} status 修改后实体的状态值
     * @return {Promise}
     */
    async modifyStatus(items, status) {
        let ids = u.pluck(items, 'id');
        let transitionItem = this.model.getTransitionForStatus(status);
        let context = {
            ids: ids,
            items: items,
            status: status,
            statusName: transitionItem.statusName,
            command: transitionItem.command,
            reload: transitionItem.reload
        };

        // 需要后端提示消息的，再额外加入用户确认的过程
        if (this.requireAdviceFor(context)) {
            let advice = await this.model.getAdvice(status, ids);
            await this.view.waitModifyStatusConfirm(context, advice);
        }

        try {
            await this.model[context.statusName](context.ids);

            this.notifyModifySuccess(context);

            let event = this.fire('statusupdate', context);
            if (context.reload === false) {
                this.updateItems(context);
            }
            else if (!event.isDefaultPrevented()) {
                this.reload();
            }
        }
        catch (ex) {
            this.notifyModifyFail(context);
        }
    }

    /**
     * 检查指定操作是否需要后端提示消息，默认删除操作时要求提示用户确认
     *
     * @protected
     * @method mvc.ListAction#requireAdviceFor
     * @param {meta.UpdateContext} context 操作的上下文对象
     * @return {boolean} 返回`true`表示需要提示用户
     */
    requireAdviceFor(context) {
        return context.statusName === 'remove';
    }

    /**
     * 通知修改状态操作成功
     *
     * @protected
     * @method mvc.ListAction#notifyModifySuccess
     * @param {meta.UpdateContext} context 批量操作的上下文对象
     */
    notifyModifySuccess(context) {
    }

    /**
     * 通知修改状态操作失败
     *
     * 默认提示用户“无法[操作名]部分或全部[实体名]”或“无法[操作名]该[实体名]”
     *
     * @protected
     * @method mvc.ListAction#notifyModifyFail
     * @param {meta.UpdateContext} context 批量操作的上下文对象
     */
    notifyModifyFail(context) {
        let entityDescription = this.entityDescription;
        if (context.ids.length > 1) {
            this.view.alert(
                `无法${context.command}部分或全部${entityDescription}`,
                `${context.command}${entityDescription}`
            );
        }
        else {
            this.view.alert(
                `无法${context.command}该${entityDescription}`,
                `${context.command}${entityDescription}`
            );
        }
    }

    /**
     * 更新列表中的实体的状态
     *
     * @protected
     * @method mvc.ListAction#updateItems
     * @param {meta.UpdateContext} context 操作的上下文对象
     */
    updateItems(context) {
        let targetStatus = context.status;
        let indexList = context.ids.map(::this.model.indexOf);
        let commands = {
            results: indexList.reduce(
                (combine, index) => {
                    combine[index] = {status: {$set: targetStatus}};
                    return combine;
                },
                {}
            )
        };
        this.model.update(commands);

        let items = u.pick(this.model.get('results'), ...indexList);
        this.view.updateItems(items);
    }

    /**
     * 根据布局变化重新调整自身布局
     *
     * @protected
     * @method mvc.ListAction#adjustLayout
     */
    adjustLayout() {
        this.view.adjustLayout();
    }

    /**
     * 获取table已经选择的列的数据
     *
     * @protected
     * @method mvc.ListAction#getSelectedItems
     * @return {Object[]} 当前table的已选择列对应的数据
     */
    getSelectedItems() {
        return this.view.getSelectedItems();
    }

    /**
     * @override
     */
    initBehavior() {
        super.initBehavior();

        this.layoutChangeNotifier.on('layoutchanged', this.adjustLayout, this);
    }

    /**
     * @override
     */
    leave() {
        this.layoutChangeNotifier.un('layoutchanged', this.adjustLayout, this);

        super.leave();
    }

    /**
     * @private
     */
    @viewEvent('search')
    onSearch() {
        this.performSearch();
    }

    /**
     * @private
     */
    @viewEvent('pagesizechange')
    async onPageSizeChange(e) {
        await this.model.updatePageSize(e.pageSize);
        let event = this.fire('pagesizechange');
        if (!event.isDefaultPrevented()) {
            let query = this.getSearchQuery();
            query.page = 1;
            this.reloadWithQueryUpdate(query);
        }
    }

    /**
     * @private
     */
    @viewEvent('pagechange')
    onPageChange() {
        let event = this.fire('pagechange');
        if (!event.isDefaultPrevented()) {
            let query = this.getSearchQuery();
            this.reloadWithQueryUpdate(query);
        }
    }

    /**
     * @private
     */
    @viewEvent('batchmodify')
    onBatchModify(e) {
        let items = this.getSelectedItems();
        this.modifyStatus(items, e.status);
    }

    /**
     * @private
     */
    @viewEvent('tablesort')
    onTableSort(e) {
        let event = this.fire('tablesort');
        if (!event.isDefaultPrevented()) {
            let query = this.getSearchQuery();
            query.page = 1;
            this.reloadWithQueryUpdate(query);
        }
    }

    /**
     * @private
     */
    @viewEvent('modifystatus')
    onModifyStatus(e) {
        let item = this.model.getItemById(e.id);
        this.modifyStatus([item], e.status);
    }

    /**
     * @private
     */
    @viewEvent('openform')
    onOpenForm({url, type}) {
        this.redirect(url);
    }
}
