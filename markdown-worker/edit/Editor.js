var Showdown = require('../public/markdown/showdown').converter,
	Mustache = require('mustache'),
	fs = require('fs'),
	AzureBlobService = require('../lib/azureBlobService'),
	FileTreeHelper = require('../lib/FileTreeHelper.js');

var template = fs.readFileSync("./edit/editor.html.mu", 'utf8');
var defaultContent = function(name) {
		return "# " + name + " page\n\nThis editor page is currently empty.\n\nYou can put some content in it with the editor on the right. As you do so, the document will update live on the left, and live for everyone else editing at the same time as you. Isn't that cool?\n\nThe text on the left is being rendered with markdown, so you can do all the usual markdown stuff like:\n\n- Bullet\n  - Points\n\n[links](http://google.com)\n\n[Go back to the main page](Main)";
    };

module.exports = Editor;

function Editor(){
	this.blobService = new AzureBlobService();
}

Editor.prototype = {

	render: function(content, docName, res) {
		var markdown = (new Showdown()).makeHtml(content);
		var data = {
			content: content,
			markdown: markdown,
			docName: docName
		}
		var html = Mustache.to_html(template, data);
		res.writeHead(200, {'content-type': 'text/html'});
		res.end(html);
	},
	
	// open a document stored in the server
	openDocument: function(docName, model, res) {
		var self = this;
		return model.getSnapshot(docName, function(error, data) {
			if (error === 'Document does not exist') {
			  return model.create(docName, 'text', function() {
				var content = defaultContent(docName);
				return model.applyOp(docName, { op: [ { i: content, p: 0 } ], v: 0 }, function() {
					return self.render(content, docName, res);
				});
			  });
			} else {
				return self.render(data.snapshot, docName, res);
			}
		});
	},
	
	// open the file and save it as a new document
	openFile: function(filePath, docName, model, res) {
		var self = this;
		var content = fs.readFileSync(filePath, 'utf8');
		docName = req.files.openFileInput.name.split('.')[0];
		model.create(docName, 'text', function() {
			model.applyOp(docName, { op: [ { i: content, p: 0 } ], v: 0 }, function() {
				res.redirect('/' + docName);
			});
		});
	},

	// open the blob and save it as a new document
	openBlob: function(containerName, blobName, model, res) {
		var self = this;
		self.blobService.getBlobToText(containerName, blobName,  function(err, blob){
			if (!err){
				docName = blobName.split('/')[blobName.split('/').length - 1].split('.')[0];
				model.create(docName, 'text', function() {
					model.applyOp(docName, { op: [ { i: blob, p: 0 } ], v: 0 }, function() {
						res.redirect('/' + docName);
					});
				});
			}
			else
				console.log(err);
		});
	},
	
	saveFile: function(docName, model, res){
		var self = this;
		return model.getSnapshot(docName, function(error, data) {
			if (!error){
				var tempPath = 'temp.markdown';
				fs.writeFileSync(tempPath, data.snapshot);
				res.download(tempPath, docName + '.markdown');
			}
		});
	},
	
	preview: function(docName, model, res){
		var self = this;
		return model.getSnapshot(docName, function(error, data) {
			if (!error){
				var markdown = (new Showdown()).makeHtml(data.snapshot);
				var htmlData = { markdown: markdown, docName: docName };
				previewHtml = fs.readFileSync("./edit/preview.html.mu", 'utf8');
				var html = Mustache.to_html(previewHtml, htmlData);
				res.writeHead(200, {'content-type': 'text/html'});
				res.end(html);
			}
		});
	},

	saveBlob: function(blobName, model, res) {
		var self = this;
		self.blobService.getBlobToText(self.containerName, blobName,  function(err, blob){
			if (!err){
				model.create(blobName, 'text', function() {
					model.applyOp(blobName, { op: [ { i: blob, p: 0 } ], v: 0 }, function() {
						res.redirect('/' + blobName);
					});
				});
			}
			else
				console.log(err);
		});
	},
	
	listBlobStructure: function(directory, req, res){
		var self = this;
		directory = unescape(directory);
		if (!directory){
			self.blobsInContainer = null;
			self.blobService.getAllContainerNames(function(err, result){
				if (!err){
					var html = FileTreeHelper.generateContainersHtml(result);
					res.send(html);
				}
				else
					console.log(err);
			});
		}
		else{
			directory = directory.replace(/\/$/, '').trim();
			if(!req.session.blobsInContainer || req.session.blobsInContainer.containerName != directory.split('/')[0]){
				self.blobService.getAllBlobsNamesInContainer(directory,function(err, result){
					if (!err){
						FileTreeHelper.addRootInPath(directory, result);
						req.session.blobsInContainer = { 'containerName': directory, 'blobs': result};
						var html = FileTreeHelper.generateBlobsHtml(directory, result);
						res.send(html);
					}
					else
						console.log(err);
				});
			}
			else{
				var html = FileTreeHelper.generateBlobsHtml(directory, req.session.blobsInContainer.blobs);
				res.send(html);
			}
		}
	},
};