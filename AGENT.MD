========AI必读====

项目初始化事项:

P1: 如果本Ageng中没有安装find-skills(https://github.com/vercel-labs/skills)就安装它,如果有安装,就使用find-skills, 
结合该项目,安装合适的skills及MCP并保证在项目可以自动调用skills及mcp.禁止把find-skills误做成了一个插件包使用(这样做的后果到时插件菜单系统及agent系统崩溃)



全局规则:

P1: 对话回复使用中文
P2:　所有临时文件及命令禁止放在乱放，必须放在项目根目录中的temp临时目录中.如果没有就新建.
1. 禁止AI偷懒.
2. 禁止不调查直接出结论.
3. 禁止AI提供假数据及假结论及胡编乱造.
4. 每次对话结束只要有修改数据,必须github同步更新本地及远程.
5. 禁止在系统内build docker, 使用github /action远程编译.