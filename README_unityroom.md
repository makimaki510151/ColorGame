# Unityroom 用 Build 生成

`deji_2dRun` を参考に、Unityroom にアップする `Build` 配下の 4 ファイルのみ生成します。

## 実行

```powershell
.\package-unityroom.ps1
```

## 生成ファイル

- `Build/ColorGame.loader.js`
- `Build/ColorGame.framework.js.gz`
- `Build/ColorGame.data.gz`
- `Build/ColorGame.wasm.gz`

## 投稿時

Unityroom には上記 4 ファイルを `Build` フォルダとしてアップロードしてください。
