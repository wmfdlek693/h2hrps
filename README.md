# Hearts2Hearts 취향표

Vercel에 바로 배포할 수 있는 Next.js 프로젝트입니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 여세요.

## Vercel 배포

### GitHub를 사용하는 방법

1. 이 폴더의 파일을 새 GitHub 저장소에 올립니다.
2. [Vercel](https://vercel.com)에 로그인하고 **Add New → Project**를 선택합니다.
3. 방금 만든 GitHub 저장소를 Import 합니다.
4. Framework Preset이 **Next.js**인지 확인합니다.
5. 별도 환경 변수 없이 **Deploy**를 누릅니다.

### Vercel CLI를 사용하는 방법

```bash
npm install -g vercel
vercel
```

화면 안내에 따라 프로젝트를 연결한 뒤, 운영 배포는 아래 명령으로 실행합니다.

```bash
vercel --prod
```

## 주요 폴더

- `app/`: 페이지와 UI 소스
- `public/`: 로고, 폰트, 멤버 이미지
- `package.json`: 실행 및 빌드 설정
- `next.config.ts`: Next.js 설정

`node_modules`와 `.next`는 ZIP에 포함되어 있지 않습니다. 압축을 푼 뒤 `npm install`을 실행하세요.
