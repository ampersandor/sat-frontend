# SAT Backend API Specification

## Base URL
```
http://localhost:8080/api/v1
```

## Authentication
현재 인증이 구현되어 있지 않습니다.

## Endpoints

### 1. Health Check

#### GET `/health`
서버 상태를 확인합니다.

**Response**
```json
{
  "status": "UP",
  "timestamp": "2025-09-10T10:00:00",
  "details": "Thanks for asking :)"
}
```

---

### 2. Artifact Management

#### POST `/artifact/upload`
파일을 업로드합니다.

**Headers**
- `Content-Type: multipart/form-data`

**Request Body**
- `file`: 업로드할 파일 (multipart)

**Response**
```json
{
  "id": "string",
  "filename": "string",
  "directory": "string",
  "createdAt": "2025-09-10T10:00:00",
  "size": 1024,
  "artifactType": "INPUT"
}
```

#### GET `/artifact/download/{artifactId}`
파일을 다운로드합니다.

**Path Parameters**
- `artifactId`: 다운로드할 artifact의 ID

**Response**
- Binary file data
- Headers:
  - `Content-Disposition: attachment; filename="filename.ext"`
  - `Content-Type: application/octet-stream`

#### GET `/artifact/list/{artifactType}`
특정 타입의 artifact 목록을 조회합니다.

**Path Parameters**
- `artifactType`: `INPUT` 또는 `OUTPUT`

**Response**
```json
[
  {
    "id": "string",
    "filename": "string",
    "directory": "string",
    "createdAt": "2025-09-10T10:00:00",
    "size": 1024,
    "artifactType": "INPUT"
  }
]
```

---

### 3. Analysis (Alignment) Operations

#### POST `/analyze/align/{artifactId}`
파일 정렬 작업을 시작합니다.

**Path Parameters**
- `artifactId`: 정렬할 artifact의 ID

**Request Body**
```json
{
  "tool": "mafft", // "mafft", "uclust", "vsearch" 중 하나
  "options": "string"
}
```

**Response**
```json
{
  "id": "string",
  "taskId": "string",
  "inputArtifactId": "string",
  "baseName": "string",
  "dirName": "string",
  "tool": "mafft",
  "options": "string",
  "createdAt": "2025-09-10T10:00:00",
  "updatedAt": "2025-09-10T10:00:00",
  "outputArtifactId": "string",
  "jobStatus": "PENDING",
  "message": "string"
}
```

#### POST `/analyze/update`
정렬 작업 상태를 업데이트합니다.

**Request Body**
```json
{
  "task_id": "string",
  "status": "SUCCESS", // "PENDING", "RUNNING", "SUCCESS", "ERROR" 중 하나
  "output_file": "string",
  "output_dir": "string",
  "message": "string"
}
```

**Response**
```json
{
  "id": "string",
  "taskId": "string",
  "inputArtifactId": "string",
  "baseName": "string",
  "dirName": "string",
  "tool": "mafft",
  "options": "string",
  "createdAt": "2025-09-10T10:00:00",
  "updatedAt": "2025-09-10T10:00:00",
  "outputArtifactId": "string",
  "jobStatus": "SUCCESS",
  "message": "string"
}
```

---

### 4. Job Management

#### GET `/jobs`
작업 목록을 페이지네이션으로 조회합니다.

**Query Parameters**
- `page`: 페이지 번호 (default: 0)
- `size`: 페이지 크기 (default: 10)

**Response**
```json
{
  "content": [
    {
      "id": "string",
      "taskId": "string",
      "inputArtifactId": "string",
      "baseName": "string",
      "dirName": "string",
      "tool": "mafft",
      "options": "string",
      "createdAt": "2025-09-10T10:00:00",
      "updatedAt": "2025-09-10T10:00:00",
      "outputArtifactId": "string",
      "jobStatus": "SUCCESS",
      "message": "string"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "sorted": true,
      "ascending": false
    }
  },
  "totalElements": 100,
  "totalPages": 10,
  "last": false,
  "first": true,
  "numberOfElements": 10
}
```

#### GET `/jobs/sse`
Server-Sent Events를 통해 작업 상태 업데이트를 실시간으로 수신합니다.

**Headers**
- `Accept: text/event-stream`

**Response (Stream)**
```
data: {"id":"string","taskId":"string","inputArtifactId":"string",...}

data: {"id":"string","taskId":"string","inputArtifactId":"string",...}
```

---

## Data Types

### JobStatus
- `PENDING`: 대기 중
- `RUNNING`: 실행 중
- `SUCCESS`: 성공
- `ERROR`: 오류

### ArtifactType
- `INPUT`: 입력 파일
- `OUTPUT`: 출력 파일

### Tool
- `mafft`: MAFFT alignment tool
- `uclust`: UCLUST clustering tool
- `vsearch`: VSEARCH tool

---

## Error Responses

모든 API는 오류 발생 시 다음과 같은 형태로 응답합니다:

```json
{
  "timestamp": "2025-09-10T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Error description",
  "path": "/api/v1/endpoint"
}
```

### Common HTTP Status Codes
- `200 OK`: 성공
- `400 Bad Request`: 잘못된 요청
- `404 Not Found`: 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 내부 오류

---

## Usage Examples

### 1. 파일 업로드 후 정렬 작업 실행

```javascript
// 1. 파일 업로드
const formData = new FormData();
formData.append('file', fileObject);

const uploadResponse = await fetch('/api/v1/artifact/upload', {
  method: 'POST',
  body: formData
});
const artifact = await uploadResponse.json();

// 2. 정렬 작업 시작
const alignResponse = await fetch(`/api/v1/analyze/align/${artifact.id}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tool: 'mafft',
    options: '--auto'
  })
});
const job = await alignResponse.json();

// 3. SSE로 상태 모니터링
const eventSource = new EventSource('/api/v1/jobs/sse');
eventSource.onmessage = (event) => {
  const jobUpdate = JSON.parse(event.data);
  if (jobUpdate.id === job.id) {
    console.log('Job status:', jobUpdate.jobStatus);
    if (jobUpdate.jobStatus === 'SUCCESS') {
      // 결과 파일 다운로드
      window.location.href = `/api/v1/artifact/download/${jobUpdate.outputArtifactId}`;
    }
  }
};
```

### 2. 작업 목록 조회

```javascript
const response = await fetch('/api/v1/jobs?page=0&size=20');
const jobPage = await response.json();
console.log('Total jobs:', jobPage.totalElements);
jobPage.content.forEach(job => {
  console.log(`Job ${job.id}: ${job.jobStatus}`);
});
```
