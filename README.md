# Oh My Resume

一个静态的 Markdown 简历编辑器。左侧编辑 Markdown，右侧实时预览 A4 简历，并通过浏览器打印导出 PDF。

在线使用：

<https://nozomix1.github.io/oh-my-resume/>

## 本地运行

```bash
npm run serve
```

打开 <http://localhost:4173>。

## 测试

```bash
npm test
```

## 导出 PDF

点击 `Print / Save PDF`，然后在系统打印窗口中选择 `Save as PDF`。

推荐使用 Chrome 导出 PDF。打印时请勾选 `Background graphics`，这样模板装饰、色块和背景元素才会被保留。

## 照片

照片由工具栏控制。上传图片后会自动加入预览，点击 `Remove Photo` 可以移除。Markdown 中的 `照片` 或 `头像` 字段会被忽略。

## 部署

这个项目没有构建步骤，可以直接用 GitHub Pages 发布仓库根目录。
