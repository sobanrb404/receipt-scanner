from app.services.extract import _strip_code_fences


def test_strip_code_fences_removes_markdown_wrapper():
    wrapped = '```json\n{"vendor": "Test"}\n```'
    assert _strip_code_fences(wrapped) == '{"vendor": "Test"}'


def test_strip_code_fences_leaves_plain_json_untouched():
    plain = '{"vendor": "Test"}'
    assert _strip_code_fences(plain) == plain
