

首先: 把https://github.com/BigPizzaV3/CodexPlusPlus 克隆下来并学习此项目


背景: 目前此项目只有GUI界面的app, 无法直接在使用在linux cli系统中.
环境: 安装在已安装过Codex的系统中,通过此项目,可以让Codex 轻松接入其它LLM并随时切换.

目标: 我需要把此项目改造成web界面访问设置, docker compose安装，接入其它LLM并随时切换,让codex顺利使用.

github:把此项目同步到https://github.com/michaellab7284 , 当前还没有建立新仓库,在进行建立并同步.

P1: 评估可行性,及使用docker是否可以可行??

P2:　如果可行，

A.整理整个项目资料规划+实施计划形成规划书
B.按照规划书按照开始实施，一直到完成目标．

=====
我需要的你WEB中测试的是: 使用官方deepseek测试在codex可否正常使用?  这才是关键.因为这个WEB就是这个作用.

API key 直接从claude的配置文件中找

==========


加入全局规则:
如果out 是:deepseek-v4-flash is temporarily unavailable, so auto mode cannot determine the safety of Bash right now. Wait briefly and then try this action again. If it keeps failing, continue with other tasks that don't require this action and come back to it later. Note: reading files, searching code, and other read-only operations do not require the classifier and can still be used.
在BASH环境下输入 claude --dangerously-skip-permissions 或IS_SANDBOX=1 claude --dangerously-skip-permissions


然后确认并测试根据规则是否可以解决上面的问题, 如果解决了请回复我.并继续回归主线.

deepseek-v4-flash 暂时不可用，因此自动模式目前无法判断 Bash 命令的安全性



========
全局规则加入:
1. 禁止AI偷懒.
2. 禁止不调查直接出结论.
3. 禁止AI提供假数据及假结论及胡编乱造.
4. 每次对话结束只要有修改数据,必须github同步更新本地及远程.

web问题及需求: 
P1:概览中无法启动Codex,请修正
P2: 供应商列表删除默认中转,
P3:供应商列表页面中,添加保存供应商后,但实际没有保存,里面所有的信息都是空的.请修正.例外供应商测试时没有详细的反馈信息.里面空的配置测试时都显示成功,简直扯淡.
P4: 你说你测试通过了,但是为什么web页面还不能正常使用.我要求的web页面可以设置正常.以便codex可以使用web工具中转配置.让codex可以正常调用.






