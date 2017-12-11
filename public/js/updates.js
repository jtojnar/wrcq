$(function() {
	$('#update-form').hide();
	$('#show-form').click(function showFormClickHandler(e) {
		$('#update-form').show(200);
		$('#content').focus();
		$(this).hide();
	});
	$('#update-add').click(function addUpdateClickHandler(e) {
		e.preventDefault();

		var content = $('#content').val().trim();
		if (content === '') {
			return window.alert('Please enter some content.');
		}

		var self = this;
		$.post('/api/update/add', {content: content}).done(function updateSucceeded(data) {
			self.form.reset();
			$(self.form).hide().parent().after($('<dt><button class="btn btn-xs edit-update" data-id="' + data + '" type="button" title="Edit"><span class="glyphicon glyphicon-pencil"></span></button>Today</dt><dd>' + content + '</dd>'));
			$('#update-form').hide();
			$('#show-form').show();
		}).fail(function updateFailed() {
			window.alert('Updating the website failed. Please try again later.');
		});
	});
	$('dl.news').on('click', '.edit-update', function editUpdateClickHandler(e) {
		var enableEditationButton = $(this);
		var dd = enableEditationButton.parent().next('dd');
		var textarea = $('<textarea class="form-control">' + dd.html().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</textarea>');
		var button = $('<button class="btn btn-m btn-primary btn-block save-update" type="button" title="Save update"><span class="glyphicon glyphicon-ok"></span></button>');
		button.click((function(textarea, enableEditationButton) {
			return function saveUpdateClickHandler(e) {
				var content = textarea.val();
				$.post('/api/update/edit', {id: enableEditationButton.attr('data-id'), content: content}).done((function(content, textarea, enableEditationButton) {
					return function updateSucceeded() {
						$(textarea).parent().html(content);
						enableEditationButton.show();
					};
				})(content, textarea, enableEditationButton)).fail(function updateFailed() {
					window.alert('Saving the update failed. Please try again later.');
				});
			};
		})(textarea, enableEditationButton));
		dd.html(textarea).append(button);
		$(this).hide();
	});
});
