/* ===== Feedback Module ──────────────────── */
(function () {
  "use strict";

  // Toggle feedback modal
  function toggleFeedbackModal() {
    var modal = document.getElementById('feedbackModal');
    if (!modal) return;
    if (modal.style.display === 'none' || modal.style.display === '') {
      modal.style.display = 'block';
      // Use overflow-y: scroll to keep scrollbar visible and prevent layout shift
      document.body.style.overflowY = 'scroll';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      // Reset form and hide success message
      var form = document.getElementById('feedbackForm');
      var success = document.getElementById('feedbackSuccess');
      if (form) form.style.display = 'block';
      if (success) success.style.display = 'none';
    } else {
      modal.style.display = 'none';
      document.body.style.overflowY = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }
  window.toggleFeedbackModal = toggleFeedbackModal;

  // Submit feedback to server
  async function submitFeedback(name, title, content) {
    try {
      const resp = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, title: title, content: content })
      });
      return resp.ok;
    } catch (e) {
      console.error('Feedback submission failed:', e);
      return false;
    }
  }

  // Form submission handler
  window.addEventListener('DOMContentLoaded', function() {
    var form = document.getElementById('feedbackForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var name = document.getElementById('feedbackName').value.trim();
      var title = document.getElementById('feedbackTitle').value.trim();
      var content = document.getElementById('feedbackContent').value.trim();

      if (!name || !title || !content) {
        alert('请填写所有必填项');
        return;
      }

      // Disable submit button
      var submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      var success = await submitFeedback(name, title, content);
      if (success) {
        form.style.display = 'none';
        document.getElementById('feedbackSuccess').style.display = 'block';
        // Reset form
        form.reset();
        // Auto-close after 2 seconds
        setTimeout(toggleFeedbackModal, 2000);
      } else {
        alert('提交失败，请稍后重试');
      }

      if (submitBtn) submitBtn.disabled = false;
    });

    // Close modal when clicking outside
    var modal = document.getElementById('feedbackModal');
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) toggleFeedbackModal();
      });
    }
  });

})();
