function setupBatchProgress(options) {
  const form = document.getElementById(options.formId);
  if (!form) {
    return;
  }

  form.addEventListener("submit", async function (event) {
    const items =
      options.itemType === "files"
        ? Array.from(form.querySelector(options.itemSelector).files)
        : Array.from(form.querySelectorAll(options.itemSelector));
    const total = items.length;
    if (!total) {
      return;
    }
    event.preventDefault();

    const operationId = crypto.randomUUID();
    const formData = new FormData(form);
    formData.append(options.idField, operationId);
    const progressContainer = document.getElementById(options.progressContainerId);
    const progress = document.getElementById(options.progressId);
    const progressText = document.getElementById(options.progressTextId);
    const controls = Array.from(form.querySelectorAll(options.controlsSelector));

    controls.forEach((control) => (control.disabled = true));
    progress.max = total;
    progress.value = 0;
    progressContainer.hidden = false;
    progressText.textContent = `0/${total} completed`;

    const statusUrl = `${window.location.pathname}${options.statusPath}/${operationId}/`;
    let polling = false;

    async function updateProgress() {
      if (polling) {
        return;
      }
      polling = true;
      try {
        const response = await fetch(statusUrl, { credentials: "same-origin" });
        if (response.ok) {
          const status = await response.json();
          const completed = Math.min(status.completed, total);
          progress.value = completed;
          progressText.textContent = `${completed}/${total} completed`;
          if (status.failed) {
            progressText.textContent += ` — ${options.operationName} failed`;
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        polling = false;
      }
    }

    const intervalId = window.setInterval(updateProgress, 1000);
    try {
      const response = await fetch(form.action || window.location.href, {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`${options.operationName} failed with status ${response.status}`);
      }

      await updateProgress();
      window.location.assign(response.url);
    } catch (error) {
      progressText.textContent = `${progress.value}/${total} completed — ${options.operationName} failed`;
      controls.forEach((control) => (control.disabled = false));
      console.error(error);
    } finally {
      window.clearInterval(intervalId);
    }
  });
}
