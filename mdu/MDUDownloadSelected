// ==UserScript==
// @name         MonikaDesign - 在菜单中点击下载选中种子
// @namespace    https://monikadesign.uk/
// @version      1.7
// @description  在 MonikaDesign 相似种子页面的“已选中”下拉菜单中添加“下载”选项，通过模拟点击按钮下载。
// @author       Gemini 2.5 Pro modified by nanodesu
// @match        https://monikadesign.uk/torrents/similar/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/toastify-js
// @resource     TOASTIFY_CSS https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 配置 ---
    const SELECTED_ACTIONS_DROPDOWN_SELECTOR = 'div.dropdown > ul.dropdown-menu';
    const TABLE_CONTAINER_SELECTOR = '.table-responsive';
    const DOWNLOAD_DELAY_MS = 1000; // 点击按钮可能需要稍长延迟以避免浏览器阻止
    const DOWNLOAD_MENU_ITEM_CLASS = 'gm-download-selected-li';
    // !! 新增：用于定位每行下载按钮的选择器 !!
    const DOWNLOAD_BUTTON_SELECTOR = 'a[href*="/torrents/download/"] button.btn-primary';

    // --- 注入 CSS ---
    const toastifyCss = GM_getResourceText("TOASTIFY_CSS");
    GM_addStyle(toastifyCss);
    GM_addStyle(`
        .toastify { z-index: 9999 !important; }
        .${DOWNLOAD_MENU_ITEM_CLASS} a { cursor: pointer; }
    `);

    let observedNode = null;

    // --- 辅助函数 ---

    function showToast(text, type = 'info') {
        const color = type === 'success' ? "linear-gradient(to right, #00b09b, #96c93d)" :
                      type === 'error' ? "linear-gradient(to right, #ff5f6d, #ffc371)" :
                      "linear-gradient(to right, #00c6ff, #0072ff)";
        Toastify({ text, duration: 3000, gravity: "top", position: "right", style: { background: color }, stopOnFocus: true }).showToast();
    }

    function getSelectedTorrentRows() {
        const tableBody = document.querySelector('.table-responsive table tbody');
        return tableBody ? tableBody.querySelectorAll('input[type="checkbox"]:checked') : [];
    }

    // !! 修改：triggerDownload 现在接收行元素，并模拟点击按钮 !!
    function triggerDownloadClick(rowElement) {
        const downloadButton = rowElement.querySelector(DOWNLOAD_BUTTON_SELECTOR);
        if (downloadButton) {
            console.log("找到下载按钮，尝试点击:", downloadButton);
            downloadButton.click(); // 模拟点击按钮
            return true; // 表示成功找到并点击
        } else {
            console.error("在行内未找到下载按钮，选择器:", DOWNLOAD_BUTTON_SELECTOR, rowElement);
            return false; // 表示未找到按钮
        }
    }

    // !! 修改：downloadSelectedTorrents 现在调用 triggerDownloadClick !!
    async function downloadSelectedTorrents() {
        const selectedCheckboxes = getSelectedTorrentRows();
        if (selectedCheckboxes.length === 0) {
            showToast('没有选中的种子。', 'info');
            return;
        }

        showToast(`准备通过点击按钮下载 ${selectedCheckboxes.length} 个种子...`, 'info');
        let clickSuccessCount = 0;
        let clickErrorCount = 0;

        for (const checkbox of selectedCheckboxes) {
            const row = checkbox.closest('tr');
            if (!row) continue;

            // 查找种子名称用于日志或提示（可选）
            const nameElement = row.querySelector('a.view-torrent.torrent-listings-name');
            const torrentName = nameElement ? nameElement.textContent.trim() : `种子ID ${checkbox.value}`;

            await new Promise(resolve => setTimeout(resolve, DOWNLOAD_DELAY_MS)); // 在每次点击前等待

            try {
                if (triggerDownloadClick(row)) {
                    console.log(`已为 "${torrentName}" 模拟点击下载按钮`);
                    clickSuccessCount++;
                } else {
                    showToast(`未能为 "${torrentName}" 找到下载按钮`, 'error');
                    clickErrorCount++;
                }
            } catch(clickError) {
               console.error(`为 "${torrentName}" 点击下载按钮时出错:`, clickError);
               showToast(`为 "${torrentName}" 点击下载按钮时出错`, 'error');
               clickErrorCount++;
            }
            // 短暂延迟，给浏览器一点反应时间
             await new Promise(resolve => setTimeout(resolve, 50));
        }

        // 最终反馈
        if (clickSuccessCount > 0) {
            showToast(`${clickSuccessCount} 个种子的下载按钮已被点击。请检查浏览器下载。`, 'success');
        }
        if (clickErrorCount > 0) {
            showToast(`${clickErrorCount} 个种子的下载按钮未能找到或点击失败。`, 'error');
        }
    }

    // 查找并注入“下载选中”菜单项 (与 V1.6 相同)
    function findAndInjectDownloadAction() {
         if (!observedNode) return;
        const dropdownMenu = observedNode.querySelector(SELECTED_ACTIONS_DROPDOWN_SELECTOR);
        if (dropdownMenu) {
            requestAnimationFrame(() => { // 使用 rAF 延迟注入
                if (dropdownMenu.querySelector(`.${DOWNLOAD_MENU_ITEM_CLASS}`)) return;

                const downloadLi = document.createElement('li');
                downloadLi.className = DOWNLOAD_MENU_ITEM_CLASS;
                downloadLi.setAttribute('role', 'presentation');
                const downloadAction = document.createElement('a');
                downloadAction.setAttribute('role', 'menuitem');
                downloadAction.setAttribute('tabindex', '-1');
                downloadAction.href = '#';
                const menuTextSpan = document.createElement('span');
                menuTextSpan.className = 'menu-text';
                menuTextSpan.textContent = '下载'; // 菜单项文本
                downloadAction.appendChild(menuTextSpan);
                downloadAction.onclick = (e) => {
                    e.preventDefault();
                    downloadSelectedTorrents(); // 点击时调用新的下载函数
                };
                downloadLi.appendChild(downloadAction);
                dropdownMenu.appendChild(downloadLi); // 添加到菜单末尾
                console.log("已将'下载选中'(点击按钮模式)选项添加到下拉菜单。");
            });
        }
    }

    // --- 初始化和观察 (与 V1.6 相同) ---
    function initializeObserver() {
        const tableContainer = document.querySelector(TABLE_CONTAINER_SELECTOR);
        if (!tableContainer) {
            console.error("MonikaDesign 下载选中: 未能找到表格容器:", TABLE_CONTAINER_SELECTOR);
            return;
        }
        observedNode = tableContainer.closest('div[wire\\:id]');
        if (observedNode) {
            console.log("MonikaDesign 下载选中: 找到 Livewire 组件容器:", observedNode.getAttribute('wire:id'));
            const observerConfig = { childList: true, subtree: true };
            const callback = function(mutationsList, observer) { findAndInjectDownloadAction(); };
            const observer = new MutationObserver(callback);
            observer.observe(observedNode, observerConfig);
            findAndInjectDownloadAction();
            console.log("MonikaDesign - 在菜单中点击下载选中种子脚本已初始化 (V1.7)。");
        } else {
            console.error("MonikaDesign 下载选中: 从表格容器未能向上找到带有 'wire:id' 的父级 div。");
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializeObserver, 500);
    } else {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initializeObserver, 500));
    }

})();
