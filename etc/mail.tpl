<!DOCTYPE html>
<html>
<head>
	<style type="text/css">
		* {
			font-family: verdana,'Microsoft YaHei',Consolas,'Deja Vu Sans Mono','Bitstream Vera Sans Mono';
			font-size: 12px;
		}
		.succ {
			color: green;
		}
		.fail {
			color: red;
		}
		#t tr th {
			width: 80px;
			text-align: right;
		}
	</style>
</head>
<body>
	<table id="t">
	    {{if .IsUpgrade}}
	        <tr>[报警已升级]</tr>
	    {{end}}

		<tr>
			<th>级别状态：</th>
			{{if .IsAlert}}
			<td class="fail">{{.Status}}</td>
			{{else}}
			<td class="succ">{{.Status}}</td>
			{{end}}
		</tr>
		<tr>
            <th>策略名称：</th>
            <td>{{.Sname}}</td>
        </tr>
        <tr>
            <th>endpoint：</th>
            <td>{{.Endpoint}}</td>
        </tr>
		<tr>
            <th>挂载节点：</th>
            <td>
			{{range .Bindings}}
			{{.}}<br />
			{{end}}
			</td>
        </tr>
		<tr>
			<th>metric：</th>
			<td>{{.Metric}}</td>
		</tr>
		<tr>
            <th>tags：</th>
            <td>{{.Tags}}</td>
        </tr>
        <tr>
            <th>当前值：</th>
            <td>{{.Value}}</td>
        </tr>
		<tr>
			<th>报警说明：</th>
			<td>
				{{.Info}}
			</td>
		</tr>
		<tr>
			<th>触发时间：</th>
			<td>
				{{.Etime}}
			</td>
		</tr>
		<tr>
			<th>报警详情：</th>
			<td>{{.Elink}}</td>
		</tr>
		<tr>
			<th>报警策略：</th>
			<td>{{.Slink}}</td>
		</tr>
		{{if .HasClaim}}
            <tr>
                <th>认领报警：</th>
                <td>{{.Clink}}</td>
            </tr>
        {{end}}
	</table>
</body>
</html>