"""Critical-path API tests: upload → annotate → dashboard filter/group."""

SAMPLE = (
    "# Master Services Agreement\n\n"
    "The Provider shall not be liable for any indirect damages. "
    "Either party may terminate this agreement for convenience with 30 days notice. "
    "The Contractor agrees not to compete within the territory for two years.\n"
)


def _upload(client, content=SAMPLE, filename="contract.md"):
    return client.post(
        "/api/documents",
        files={"file": (filename, content.encode(), "text/markdown")},
    )


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_labels_seeded(client):
    labels = client.get("/api/labels").json()
    names = {label["name"] for label in labels}
    assert "Limitation of Liability" in names
    assert len(labels) >= 5
    # seeded labels carry hotkeys + a usage count field
    first = labels[0]
    assert first["hotkey"] == "1"
    assert "documents_count" in first


def test_create_update_delete_label(client):
    created = client.post(
        "/api/labels", json={"name": "Assignment", "color": "#4d7c0f", "hotkey": "a"}
    ).json()
    assert created["is_custom"] is True
    assert created["hotkey"] == "a"

    # edit name/colour/hotkey
    patched = client.patch(
        f"/api/labels/{created['id']}", json={"name": "Assignment Clause", "hotkey": ""}
    ).json()
    assert patched["name"] == "Assignment Clause"
    assert patched["hotkey"] is None

    # custom labels can be deleted
    assert client.delete(f"/api/labels/{created['id']}").status_code == 204


def test_hotkey_must_be_unique(client):
    # "1" is taken by a seeded label, so creating another with it is rejected
    dup = client.post(
        "/api/labels", json={"name": "Dupe", "color": "#4d7c0f", "hotkey": "1"}
    )
    assert dup.status_code == 409

    # a free hotkey works
    created = client.post(
        "/api/labels", json={"name": "Assignment", "color": "#4d7c0f", "hotkey": "z"}
    ).json()
    assert created["hotkey"] == "z"

    # re-using a hotkey via PATCH is rejected too
    clash = client.patch(f"/api/labels/{created['id']}", json={"hotkey": "1"})
    assert clash.status_code == 409

    # patching a label with its own hotkey is fine (no false clash)
    same = client.patch(f"/api/labels/{created['id']}", json={"hotkey": "z"})
    assert same.status_code == 200

    # clearing the hotkey frees it; multiple labels may have no hotkey
    cleared = client.patch(f"/api/labels/{created['id']}", json={"hotkey": ""}).json()
    assert cleared["hotkey"] is None


def test_predefined_label_cannot_be_deleted(client):
    predefined = next(
        label for label in client.get("/api/labels").json() if not label["is_custom"]
    )
    assert client.delete(f"/api/labels/{predefined['id']}").status_code == 409


def test_label_documents_count(client):
    doc = _upload(client).json()
    sentence = next(s for s in doc["sentences"] if "indirect damages" in s["text"])
    label = next(
        label
        for label in client.get("/api/labels").json()
        if label["name"] == "Limitation of Liability"
    )
    client.post(
        "/api/annotations",
        json={"sentence_id": sentence["id"], "label_id": label["id"]},
    )
    refreshed = next(
        label_
        for label_ in client.get("/api/labels").json()
        if label_["id"] == label["id"]
    )
    assert refreshed["documents_count"] == 1


def test_upload_splits_into_sentences(client):
    res = _upload(client)
    assert res.status_code == 201
    doc = res.json()
    assert doc["content_type"] == "markdown"
    assert doc["title"] == "contract"
    # heading + three sentences
    texts = [s["text"] for s in doc["sentences"]]
    assert "# Master Services Agreement" in texts
    assert any("indirect damages" in t for t in texts)
    assert len(doc["sentences"]) >= 4


def test_upload_rejects_unsupported_extension(client):
    res = client.post(
        "/api/documents",
        files={"file": ("contract.pdf", b"data", "application/pdf")},
    )
    assert res.status_code == 400


def test_annotate_sentence_and_appears_in_detail(client):
    doc = _upload(client).json()
    sentence = next(s for s in doc["sentences"] if "indirect damages" in s["text"])
    label = client.get("/api/labels").json()[0]

    res = client.post(
        "/api/annotations",
        json={"sentence_id": sentence["id"], "label_id": label["id"]},
    )
    assert res.status_code == 201
    annotation = res.json()
    assert annotation["label"]["id"] == label["id"]

    # idempotent: same pair returns existing, not a duplicate
    again = client.post(
        "/api/annotations",
        json={"sentence_id": sentence["id"], "label_id": label["id"]},
    )
    assert again.json()["id"] == annotation["id"]

    detail = client.get(f"/api/documents/{doc['id']}").json()
    annotated = next(s for s in detail["sentences"] if s["id"] == sentence["id"])
    assert annotated["annotations"][0]["label"]["name"] == label["name"]


def test_dashboard_search_filter_and_group(client):
    doc = _upload(client).json()
    sentence = doc["sentences"][1]
    label = next(
        label
        for label in client.get("/api/labels").json()
        if label["name"] == "Limitation of Liability"
    )
    client.post(
        "/api/annotations",
        json={"sentence_id": sentence["id"], "label_id": label["id"]},
    )

    # search by body text
    found = client.get("/api/documents", params={"search": "Provider"}).json()
    assert len(found["documents"]) == 1
    missing = client.get("/api/documents", params={"search": "zzzzz"}).json()
    assert missing["documents"] == []

    # search also matches the name of an applied label
    by_label = client.get("/api/documents", params={"search": "Limitation"}).json()
    assert len(by_label["documents"]) == 1

    # filter by label
    filtered = client.get("/api/documents", params={"label_id": label["id"]}).json()
    assert len(filtered["documents"]) == 1
    summary = filtered["documents"][0]
    assert summary["annotation_count"] == 1
    assert summary["labels"][0]["name"] == "Limitation of Liability"

    # group by label
    grouped = client.get("/api/documents", params={"group_by": "label"}).json()
    bucket_names = {g["label"]["name"] for g in grouped["groups"] if g["label"]}
    assert "Limitation of Liability" in bucket_names


def test_delete_document(client):
    doc = _upload(client).json()
    assert client.delete(f"/api/documents/{doc['id']}").status_code == 204
    assert client.get(f"/api/documents/{doc['id']}").status_code == 404
