<img src="https://s3-gz01.didistatic.com/n9e-pub/image/n9e-logo-bg-white.png" width="150" alt="Nightingale"/>
<br>
<br>

Nightingale是一套衍生自Open-Falcon的互联网监控解决方案，融入了部分滴滴生产环境的最佳实践，由于改动太大，已经无法与Open-Falcon平滑兼容，故而单开一个项目，作为监控圈的一个可选项，欢迎大家尝试 :-)

## 文档

使用手册请参考：[夜莺使用手册](https://n9e.didiyun.com/zh_1.0/)

## 编译

```bash
mkdir -p $GOPATH/src/github.com/didi
cd $GOPATH/src/github.com/didi
git clone https://github.com/didi/nightingale.git
cd nightingale && ./control build
```

## 团队

参与项目的小伙伴包括：[ulricqin](https://github.com/ulricqin) [710leo](https://github.com/710leo) [jsers](https://github.com/jsers) [hujter](https://github.com/hujter) [n4mine](https://github.com/n4mine) [heli567](https://github.com/heli567)，感谢大家的付出

## 协议

<img alt="Apache-2.0 license" src="https://s3-gz01.didistatic.com/n9e-pub/image/apache.jpeg" width="128">

Nightingale 基于 Apache-2.0 协议进行分发和使用，更多信息参见 [协议文件](LICENSE)。

