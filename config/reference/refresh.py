import os
import urllib.parse

basepath = '.'
blocked_files = [ 'index.html', 'refresh.py', '.refresh.py.swp' ]
index_html = """
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Download</title>
	</head>
	<body>
		<h1>Download Files</h1>
		<p>
			<b>Files:</b><br/>
{links}
		</p>
	</body>
</html>
"""
links_html = ""
for entry in os.listdir(basepath):
	if os.path.isfile(os.path.join(basepath, entry)) and not(entry in blocked_files):
		links_html += "\t\t\t<a target=\"_blank\" href=\"./{}\">{}</a><br/>\n".format(urllib.parse.quote(entry, safe=''), entry)
index_html = index_html.format(links=links_html)
print(index_html)
