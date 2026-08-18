---
title: 大屏没有数据
description: 用户说某个可视化大屏空白、或某个图表不出数时
requires: [list_view_projects, get_view_project]
---

# 大屏没有数据

## 顺序

1. `list_view_projects` 拿项目标识。**「未发布」表示对外访问不到**,不是草稿没画完
2. `get_view_project` 看组件与各自的数据源
3. **先看有没有填地址** —— 组件选了接口却没填地址,在页面上看不出来,表现就是图空着,这是第一顺位
4. 地址填了再看它指向哪:相对路径要拼顶层来源地址;前缀是外部域名说明这个图在拉第三方数据,
   平台侧查不到它的数据链路

## 两件答不了的事

- **哪个大屏在看某台设备** —— 画布里不存设备绑定,不要从组件标题里认设备
- 解析不了画布 ≠ 这个大屏是空的,前者是读不出结构

## 数据源正常但仍无数据

说明问题在数据侧不在大屏,转到设备与时序链路:
[iot/data-not-updating](../iot/data-not-updating.md) 或
[iot/never-reported](../iot/never-reported.md)。
