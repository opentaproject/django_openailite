import uuid
from unittest.mock import patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from django.urls import reverse


class UploadPageTests(SimpleTestCase):
    def test_upload_page_contains_multi_file_progress(self):
        response = self.client.get(reverse("upload", kwargs={"pk": 1}))

        self.assertContains(response, 'id="upload-progress"')
        self.assertContains(response, 'id="upload-progress-text"')
        self.assertContains(response, "0/${total} completed")
        html = response.content.decode()
        self.assertLess(html.index("new FormData(form)"), html.index("fileInput.disabled = true"))
        self.assertNotIn("for (const file of files)", html)

    @patch("django_ragamuffin.views.Assistant.objects.get")
    def test_batch_upload_records_completed_file_count(self, get_assistant):
        upload_id = uuid.uuid4()
        response = self.client.post(
            reverse("upload", kwargs={"pk": 1}),
            {
                "upload_id": str(upload_id),
                "myfile": [
                    SimpleUploadedFile("one.txt", b"one"),
                    SimpleUploadedFile("two.txt", b"two"),
                ],
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(get_assistant.return_value.add_file.call_count, 2)
        status = self.client.get(reverse("upload_status", kwargs={"pk": 1, "upload_id": upload_id}))
        self.assertEqual(status.json(), {"completed": 2, "total": 2})
