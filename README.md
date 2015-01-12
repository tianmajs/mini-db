#mini-db



mini-db 提供了类似关系数据库的持久存储能力，以JSON格式将数据保存在磁盘文件中。
在JSON文件中，数据按照一个键（key）下按插入顺序存储多个值（value）的方式扁平存放,示例如下。

```
{
    "tablename": [{name:"Jim",age:10}]
}
```

## Install

    npm install mini-db

## API

### insert

```
var storage = require('mini-db');
var db = storage('./storage/db.json');
db.insert('people', { name: 'Jim', age: 27 },function(err,inserted){
	if(!err) console.log(inserted);
});
```

### select

```
var storage = require('mini-db');
var db = storage('./storage/db.json');
db.select('people').forEach(function(item){
	console.log(item.name,item.age);
});
```

### select(filter)

代码片段中，`$`表示值本身，`#`表示值在数组中的索引

```
var storage = require('mini-db');
var db = storage('./storage/db.json');
db.select('people', '$.age==27').forEach(function (item) {
   console.log(item.name + ':' + item.age);
});
db.select('people', '#==0',function(err,list){
	if(err){return;}
	list.forEach(function(item){
		console.log(item.name,':',item.age);
	});
});


```

### update

```
var storage = require('mini-db');
var db = storage('./storage/db.json');
db.update('people', { name: 'Kim', age: 27 }, '$.age==27',function(err,updated){
	if(!err) console.log(updated);
});

```

### remove

```
var storage = require('mini-db');
var db = storage('./storage/db.json');
db.remove('people', '#==0',function(err,removed){
	if(!err) console.log(removed);
});

```
