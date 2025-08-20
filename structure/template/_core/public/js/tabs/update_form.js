$(function() {
	var tab = NodeaTabs.current.tab;
	tab.find('.cancel').click(NodeaTabs.closeOverlay);
	NodeaForms(tab.find('.ajax-overlay'));
	firstElementFocus(tab.find('form'));
	/* Update after show */
	if ($('.ajax-overlay')[1]) {
		$('.ajax-overlay')[1].style.display = 'none';
	}
});