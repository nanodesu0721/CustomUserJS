// ==UserScript==
// @name         MonikaDesign 分组删种
// @namespace    https://monikadesign.uk/
// @version      1.2-zh
// @description  在 MonikaDesign 相似种子页面的每个种子分组表头添加一个“全选/全不选”复选框，通过与 Livewire 组件交互实现。
// @author       Gemini 2.5 Pro modified by nanodesu
// @match        https://monikadesign.uk/torrents/similar/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // --- 常量定义 ---
    const TABLE_SELECTOR = '.table-responsive .table'; // 目标表格的选择器
    const CHECKED_MODEL_SELECTOR = 'input[type="checkbox"][wire\\:model\\.live="checked"]'; // 单个种子复选框的选择器
    const HEADER_TH_SELECTOR = 'thead > tr > th[colspan="12"]'; // 分组表头中目标 TH 单元格的选择器
    const HEADER_CHECKBOX_CLASS = 'group-select-all-checkbox'; // 添加的主复选框的 CSS 类名

    // --- 重要：获取 Livewire 组件 ID ---
    // 尝试从包含表格的 Livewire 组件的 wire:id 属性获取
    let livewireComponentId = null;
    // MutationObserver 可能在 DOM 完全加载前运行，所以需要延迟或确保元素存在
    function findLivewireId() {
        const tableWrapperDiv = document.querySelector(TABLE_SELECTOR)?.closest('[wire\\:id]');
        if (tableWrapperDiv) {
            livewireComponentId = tableWrapperDiv.getAttribute('wire:id');
            console.log('检测到 Livewire 组件 ID:', livewireComponentId);
            // 找到后可以停止查找或后续检查
            return true;
        }
        return false;
    }

    // --- 主要功能函数：添加分组复选框及绑定事件 ---
    function addGroupCheckboxes() {
        // 确保已获取 Livewire ID
        if (!livewireComponentId && !findLivewireId()) {
             console.warn('无法找到 Livewire 组件 ID，稍后重试...');
             // 如果多次重试失败，可能需要提示用户手动配置
             return;
        }

        const table = document.querySelector(TABLE_SELECTOR);
        if (!table) return; // 表格不存在则退出

        const groupHeaderTHs = table.querySelectorAll(HEADER_TH_SELECTOR);

        groupHeaderTHs.forEach(th => {
            const thead = th.closest('thead');
            if (!thead) return;
            const tbody = thead.nextElementSibling;

            // 确保是 TBODY 且包含目标复选框
            if (tbody && tbody.tagName === 'TBODY' && tbody.querySelector(CHECKED_MODEL_SELECTOR)) {

                // 避免重复添加
                let selectAllCheckbox = th.querySelector('.' + HEADER_CHECKBOX_CLASS);
                let label = selectAllCheckbox ? selectAllCheckbox.closest('label') : null;

                if (!selectAllCheckbox) {
                    // --- 1. 创建主复选框 (如果不存在) ---
                    // console.log('为表头添加复选框:', th.textContent.trim().split('\n')[0]);
                    selectAllCheckbox = document.createElement('input');
                    selectAllCheckbox.type = 'checkbox';
                    selectAllCheckbox.className = HEADER_CHECKBOX_CLASS;
                    selectAllCheckbox.style.verticalAlign = 'middle';
                    selectAllCheckbox.style.marginRight = '5px';
                    selectAllCheckbox.title = '全选/取消全选当前分组 (与 Livewire 同步)';

                    label = document.createElement('label');
                    label.style.fontWeight = 'normal';
                    label.style.marginRight = '10px';
                    label.style.cursor = 'pointer';
                    label.appendChild(selectAllCheckbox);

                    th.insertBefore(label, th.firstChild);

                    // --- 2. 为主复选框添加事件监听器 ---
                    selectAllCheckbox.addEventListener('change', function() {
                        if (!livewireComponentId) {
                            console.error('Livewire 组件 ID 未设置，无法执行操作。');
                            this.checked = !this.checked; // 恢复视觉状态
                            return;
                        }
                        const isChecked = this.checked; // 目标状态
                        const checkboxesInGroup = tbody.querySelectorAll(CHECKED_MODEL_SELECTOR);
                        // 获取当前分组所有 checkbox 的 value (通常是种子的 ID)
                        const valuesInGroup = Array.from(checkboxesInGroup).map(cb => cb.value);

                        // 尝试获取 Livewire 组件实例
                        const component = Livewire.find(livewireComponentId);
                        if (!component) {
                            console.error(`找不到 ID 为 ${livewireComponentId} 的 Livewire 组件实例。`);
                            this.checked = !this.checked; // 恢复视觉状态
                            return;
                        }

                        // 获取 Livewire 组件当前的 'checked' 数据 (它应该是一个数组)
                        // 使用 component.snapshot.data.checked 更直接地访问快照数据，或 component.get('checked')
                        let currentCheckedValues = component.get('checked') || [];
                         // Livewire 内部可能使用 Proxy，转为纯数组以方便操作
                        currentCheckedValues = Array.from(currentCheckedValues);


                        let newCheckedValues; // 将要设置给 Livewire 的新数组

                        if (isChecked) {
                            // --- 选中操作 ---
                            // 合并当前分组的 values 到现有数组，并去重
                            newCheckedValues = [...new Set([...currentCheckedValues, ...valuesInGroup])];
                            // console.log('选中操作：将添加', valuesInGroup, '合并后：', newCheckedValues);
                        } else {
                            // --- 取消选中操作 ---
                            // 从现有数组中过滤掉当前分组的 values
                            const valuesInGroupSet = new Set(valuesInGroup);
                            newCheckedValues = currentCheckedValues.filter(value => !valuesInGroupSet.has(value));
                            // console.log('取消选中操作：将移除', valuesInGroup, '移除后：', newCheckedValues);
                        }

                        // --- 3. 使用 component.set() 更新 Livewire 组件状态 ---
                        // 这是与 Livewire 交互的关键步骤，它会触发后台更新
                        console.log(`准备通过 Livewire.set 更新 checked 为:`, newCheckedValues);
                        component.set('checked', newCheckedValues);

                        // 注意：此时不需要手动触发 click() 事件了
                        // 也不需要手动设置 checkboxesInGroup.forEach(cb => cb.checked = isChecked);
                        // Livewire 会在收到服务器响应后自己更新 DOM

                        // 为了即时反馈，可以临时设置 indeterminate 状态，等待 Livewire 更新
                        this.indeterminate = false;
                    });
                }

                // --- 4. 更新主复选框状态 (checked/indeterminate) 的逻辑 ---
                // 这个逻辑仍然需要，并且应该在每次 DOM 可能变化后执行 (比如 Livewire 更新后)
                const updateSelectAllVisualState = () => {
                    const currentTorrentCheckboxes = tbody.querySelectorAll(CHECKED_MODEL_SELECTOR); // 重新获取，以防 Livewire 替换了元素
                    if (currentTorrentCheckboxes.length === 0 || !selectAllCheckbox) return; // 如果没有复选框或主复选框丢失了，则退出

                    const total = currentTorrentCheckboxes.length;
                    const checkedCount = Array.from(currentTorrentCheckboxes).filter(cb => cb.checked).length;

                    // console.log(`更新分组状态: 总数=${total}, 选中=${checkedCount}`);

                    if (checkedCount === 0) {
                        selectAllCheckbox.checked = false;
                        selectAllCheckbox.indeterminate = false;
                    } else if (checkedCount === total) {
                        selectAllCheckbox.checked = true;
                        selectAllCheckbox.indeterminate = false;
                    } else {
                        selectAllCheckbox.checked = false; // 或者 true，取决于你希望不确定状态时主框是否勾选
                        selectAllCheckbox.indeterminate = true;
                    }
                };

                // --- 5. 绑定更新主复选框状态的触发时机 ---
                // a) 在单个复选框变化时 (虽然理论上 Livewire 更新后会触发 b，但这个可以提供更快反馈)
                //    为 tbody 添加事件委托，监听内部 checkbox 的 change 事件
                tbody.removeEventListener('change', handleTbodyChange); // 先移除旧监听器，防止重复绑定
                tbody.addEventListener('change', handleTbodyChange);

                // b) 在 Livewire 完成更新后 (这是最可靠的时机)
                //    需要一个方法来检测 Livewire 更新完成。MutationObserver 是一个通用方案。

                // 首次加载或添加时，立即更新一次状态
                updateSelectAllVisualState();
            }
        });
    }

    // tbody 事件委托处理函数
    function handleTbodyChange(event) {
        // 检查事件目标是否是我们要监听的种子复选框
        if (event.target.matches(CHECKED_MODEL_SELECTOR)) {
            // 找到对应的 thead 中的主复选框并更新其状态
            const tbody = event.currentTarget;
            const thead = tbody.previousElementSibling;
            if (thead && thead.tagName === 'THEAD') {
                const selectAllCheckbox = thead.querySelector('.' + HEADER_CHECKBOX_CLASS);
                if (selectAllCheckbox) {
                    // 延迟一点点执行，等待事件冒泡结束和可能的其他脚本处理
                    setTimeout(() => {
                        const currentTorrentCheckboxes = tbody.querySelectorAll(CHECKED_MODEL_SELECTOR);
                        const total = currentTorrentCheckboxes.length;
                        const checkedCount = Array.from(currentTorrentCheckboxes).filter(cb => cb.checked).length;
                        if (checkedCount === 0) {
                            selectAllCheckbox.checked = false;
                            selectAllCheckbox.indeterminate = false;
                        } else if (checkedCount === total) {
                            selectAllCheckbox.checked = true;
                            selectAllCheckbox.indeterminate = false;
                        } else {
                            selectAllCheckbox.checked = false;
                            selectAllCheckbox.indeterminate = true;
                        }
                    }, 0);
                }
            }
        }
    }


    // --- 执行脚本 ---
    let initialLoadTimer = null;
    let observerDebounceTimer = null;

    // MutationObserver 监视 DOM 变化
    const observer = new MutationObserver((mutationsList, observer) => {
        let needsRun = false;
        for (const mutation of mutationsList) {
            // 监测节点添加或属性变化（比如 wire:id 可能在之后才设置）
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                 // 检查 DOM 中是否出现了目标表格的关键部分
                 if (document.querySelector(TABLE_SELECTOR + ' ' + HEADER_TH_SELECTOR)) {
                    needsRun = true;
                    break;
                 }
            }
        }
        if (needsRun) {
            // 防抖动：在短时间内多次触发时，只执行最后一次
            clearTimeout(observerDebounceTimer);
            observerDebounceTimer = setTimeout(() => {
                 // console.log('DOM 变化，执行 addGroupCheckboxes');
                 if (livewireComponentId || findLivewireId()){ // 确保能找到 ID
                     addGroupCheckboxes();
                 } else {
                     console.warn("DOM 变化后仍未找到 Livewire ID");
                 }
            }, 200); // 稍微增加延迟，给 Livewire 渲染留足时间
        }
    });

    // 启动观察器
    observer.observe(document.body, {
        childList: true,  // 监视子节点的添加/删除
        subtree: true,    // 监视所有后代节点
        attributes: true, // 也监视属性变化 (比如 wire:id)
        attributeFilter: ['wire:id'] // （可选）只关心 wire:id 属性
     });

    // 页面加载完成后也尝试执行一次
    initialLoadTimer = setTimeout(() => {
        // console.log('初始加载，执行 addGroupCheckboxes');
        if (livewireComponentId || findLivewireId()) { // 确保能找到 ID
             addGroupCheckboxes();
        } else {
            console.warn("初始加载时未找到 Livewire ID");
            // 可以在这里设置一个更长的超时或放弃
        }
    }, 600); // 增加初始延迟，等待页面和 Livewire 初始化

})();
