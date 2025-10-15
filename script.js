class FaceReconstruction {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.captureBtn = document.getElementById('captureBtn');
        this.reconstructBtn = document.getElementById('reconstructBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.container = document.querySelector('.container');
        
        this.capturedImageData = null;
        this.popups = [];
        
        // 버튼 떠다니기 설정
        this.floatingButtons = [];
        this.isFloatingActive = false;
        
        // 배경음악 설정
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = 0.3; // 볼륨 30%로 설정
        
        // 통일된 크기: 480px x 640px (3:4 비율)
        this.videoWidth = 480;
        this.videoHeight = 640;
        
        // 얼굴 부위 범위 정의 - CSS와 정확히 동일한 픽셀 단위 (눈 간격 더 넓히고 가로길이 더 줄이기)
        this.faceZones = {
            // 왼쪽 눈 6등분 (눈 간격 더 넓히고 가로길이 더 줄이기)
            leftEye1: { x: 50, y: 96, width: 40, height: 40 },     // 왼쪽 눈 1/6
            leftEye2: { x: 90, y: 96, width: 40, height: 40 },    // 왼쪽 눈 2/6
            leftEye3: { x: 130, y: 96, width: 40, height: 40 },    // 왼쪽 눈 3/6
            leftEye4: { x: 50, y: 136, width: 40, height: 40 },    // 왼쪽 눈 4/6
            leftEye5: { x: 90, y: 136, width: 40, height: 40 },    // 왼쪽 눈 5/6
            leftEye6: { x: 130, y: 136, width: 40, height: 40 },    // 왼쪽 눈 6/6
            
            // 오른쪽 눈 6등분 (눈 간격 더 넓히고 가로길이 더 줄이기)
            rightEye1: { x: 290, y: 96, width: 40, height: 40 },   // 오른쪽 눈 1/6
            rightEye2: { x: 330, y: 96, width: 40, height: 40 },   // 오른쪽 눈 2/6
            rightEye3: { x: 370, y: 96, width: 40, height: 40 },  // 오른쪽 눈 3/6
            rightEye4: { x: 290, y: 136, width: 40, height: 40 },   // 오른쪽 눈 4/6
            rightEye5: { x: 330, y: 136, width: 40, height: 40 },  // 오른쪽 눈 5/6
            rightEye6: { x: 370, y: 136, width: 40, height: 40 },  // 오른쪽 눈 6/6
            
            nose: { x: 168, y: 256, width: 144, height: 128 },     // 코 영역
            mouth: { x: 120, y: 384, width: 240, height: 128 }     // 입 영역
        };
        
        // 필터 정의 (8개 필터)
        this.filters = [
            { name: 'blur', apply: this.applyBlurFilter },
            { name: 'dot', apply: this.applyDotFilter },
            { name: 'dreamcore', apply: this.applyDreamcoreFilter },
            { name: 'contrast', apply: this.applyContrastFilter },
            { name: 'saturate', apply: this.applySaturateFilter },
            { name: 'neon', apply: this.applyNeonFilter },
            { name: 'psychedelic', apply: this.applyPsychedelicFilter },
            { name: 'threshold-zero', apply: this.applyThresholdZeroFilter }
        ];
        
        this.init();
    }
    
    async init() {
        try {
            await this.startCamera();
            this.setupEventListeners();
            this.startButtonFloating(); // 버튼 떠다니기 시작
            this.initBackgroundMusic(); // 배경음악 초기화
        } catch (error) {
            console.error('카메라 초기화 실패:', error);
            alert('웹캠에 접근할 수 없습니다. 브라우저 권한을 확인해주세요.');
        }
    }
    
    initBackgroundMusic() {
        // 브라우저의 autoplay 정책 때문에 사용자 인터랙션 후 재생
        const playMusic = () => {
            this.bgMusic.play().catch(e => {
                console.log('음악 자동 재생 실패:', e);
                // 첫 클릭 시 재생 시도
                document.addEventListener('click', () => {
                    this.bgMusic.play().catch(err => console.log('음악 재생 실패:', err));
                }, { once: true });
            });
        };
        
        // 페이지 로드 후 음악 재생 시도
        playMusic();
    }
    
    async startCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: this.videoWidth, height: this.videoHeight }
        });
        this.video.srcObject = stream;
    }
    
    setupEventListeners() {
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.reconstructBtn.addEventListener('click', () => {
            if (!this.reconstructBtn.classList.contains('disabled')) {
                this.reconstructFace();
            }
        });
        this.clearBtn.addEventListener('click', () => {
            if (!this.clearBtn.classList.contains('disabled')) {
                this.clearAll();
            }
        });
    }
    
    capturePhoto() {
        // 캔버스 크기를 비디오와 정확히 동일하게 설정
        this.canvas.width = this.videoWidth;
        this.canvas.height = this.videoHeight;
        
        this.ctx.drawImage(this.video, 0, 0, this.videoWidth, this.videoHeight);
        
        const imageData = this.canvas.toDataURL('image/png');
        this.capturedImageData = imageData;
        
        // 촬영된 사진을 배경에 꽉 차게 적용
        this.setBackgroundImage(imageData);
        
        // 재구성 버튼과 초기화 버튼 활성화
        this.reconstructBtn.classList.remove('disabled');
        this.clearBtn.classList.remove('disabled');
        
        // 버튼 애니메이션
        this.captureBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.captureBtn.style.transform = '';
        }, 150);
        
        // 촬영 성공 메시지 제거
        // this.showMessage('📸 사진이 촬영되고 배경에 적용되었습니다!', 'success');
    }
    
    reconstructFace() {
        if (!this.capturedImageData) return;
        
        this.clearPopups();
        this.reconstructBtn.disabled = true;
        this.reconstructBtn.innerHTML = '<span class="loading"></span> 처리 중...';
        
        setTimeout(() => {
            this.createFaceSegments();
            this.reconstructBtn.disabled = false;
            this.reconstructBtn.innerHTML = '🔧 얼굴 재구성';
            // this.showMessage('🎭 얼굴이 재구성되었습니다!', 'success');
        }, 100);
    }
    
    createFaceSegments() {
        const img = new Image();
        img.onload = () => {
            const segments = this.divideImageIntoSegments(img);
            this.createPopups(segments);
        };
        img.src = this.capturedImageData;
    }
    
    divideImageIntoSegments(img) {
        const segments = [];
        
        console.log('이미지 크기:', img.width, 'x', img.height);
        console.log('얼굴 영역:', this.faceZones);
        
        // 각 얼굴 영역을 직접 세그먼트로 생성
        for (const [zoneName, zone] of Object.entries(this.faceZones)) {
            console.log(`${zoneName} 영역 처리:`, zone);
            
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
            canvas.width = zone.width;
            canvas.height = zone.height;
                
            // 해당 영역만 잘라내기
                ctx.drawImage(
                    img,
                zone.x, zone.y, zone.width, zone.height,
                0, 0, zone.width, zone.height
                );
                
                segments.push({
                    imageData: canvas.toDataURL(),
                x: zone.x,
                y: zone.y,
                width: zone.width,
                height: zone.height,
                zone: zoneName
            });
        }
        
        console.log('총 세그먼트 수:', segments.length);
        console.log('세그먼트 목록:', segments.map(s => s.zone));
        
        return segments;
    }
    
    
    createPopups(segments) {
        // 랜덤하게 섞어서 생성 순서 조정
        const shuffledSegments = [...segments].sort(() => Math.random() - 0.5);
        
        shuffledSegments.forEach((segment, index) => {
            setTimeout(() => {
                this.createPopup(segment, index);
            }, index * 30); // 100ms → 30ms로 단축
        });
    }
    
    createPopup(segment, index) {
        const popup = document.createElement('div');
        popup.className = 'face-popup finder-window';
        
        // Mac Finder 스타일 헤더 생성
        const header = document.createElement('div');
        header.className = 'finder-header';
        
        // 트래픽 라이트 버튼들
        const trafficLights = document.createElement('div');
        trafficLights.className = 'traffic-lights';
        trafficLights.innerHTML = `
            <div class="traffic-light close"></div>
            <div class="traffic-light minimize"></div>
            <div class="traffic-light maximize"></div>
        `;
        
        // 빨간 버튼 (닫기) 이벤트
        const closeBtn = trafficLights.querySelector('.close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closePopup(popup);
        });
        
        // 노란 버튼 (3D 회전 배경) 이벤트
        const minimizeBtn = trafficLights.querySelector('.minimize');
        minimizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 기존 모든 효과 제거 후 3D 원기둥 회전 배경 적용
            this.clearAllBackgroundEffects();
            this.setBackgroundRotating3D(popup);
        });
        
        // 초록 버튼 (파티클 효과) 이벤트
        const maximizeBtn = trafficLights.querySelector('.maximize');
        maximizeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // 파티클 효과 적용
            this.setBackgroundParticleEffect(popup);
        });
        
        // 제목 표시줄 (텍스트 없음)
        const titleBar = document.createElement('div');
        titleBar.className = 'title-bar';
        // titleBar.textContent = this.getZoneDisplayName(segment.zone); // 텍스트 제거
        
        header.appendChild(trafficLights);
        header.appendChild(titleBar);
        
        // 이미지 컨테이너
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        
        const img = document.createElement('img');
        img.src = segment.imageData;
        // 이미지 드래그 금지
        img.draggable = false;
        img.style.pointerEvents = 'none';
        imageContainer.appendChild(img);
        
        popup.appendChild(header);
        popup.appendChild(imageContainer);
        
        // 팝업 크기와 위치 설정 (통일된 크기)
        const popupSize = this.calculatePopupSize(segment);
        popup.style.width = popupSize.width + 'px';
        popup.style.height = popupSize.height + 'px';
        
        // 화면 전체에 넓게 퍼지게 배치 (실제 사람 얼굴처럼)
        const position = this.calculateWideSpreadPosition(segment, popupSize);
        popup.style.left = position.x + 'px';
        popup.style.top = position.y + 'px';
        
        // 팝업창에 고유한 z-index 설정 (얼굴 부위별로 다른 레이어)
        const zIndex = this.calculateZIndex(segment.zone);
        popup.style.zIndex = zIndex;
        
        // 필터 적용 (Saturate, Psychedelic은 한 번씩만, 나머지는 다른 필터로 채움)
        let filter;
        if (index === 0) {
            // 첫 번째 팝업창에는 Saturate
            filter = this.filters[4]; // saturate
        } else if (index === 1) {
            // 두 번째 팝업창에는 Psychedelic
            filter = this.filters[6]; // psychedelic
        } else {
            // 나머지 팝업창에는 다른 필터들로 채움 (blur, dot, dreamcore, contrast, neon, threshold-zero)
            const regularFilters = [
                this.filters[0], // blur
                this.filters[1], // dot
                this.filters[2], // dreamcore
                this.filters[3], // contrast
                this.filters[5], // neon
                this.filters[7]  // threshold-zero
            ];
            filter = regularFilters[(index - 2) % regularFilters.length];
        }
        this.applyFilterToPopup(img, filter);
        
        // 드래그 기능 추가
        this.makeDraggable(popup);
        
        // body에 추가 (화면 전체에 배치)
        document.body.appendChild(popup);
        this.popups.push(popup);
        
        console.log(`${segment.zone} 팝업창 생성됨`);
    }
    
    getZoneDisplayName(zone) {
        const zoneNames = {
            leftEye: '왼쪽 눈',
            rightEye: '오른쪽 눈',
            nose: '코',
            mouth: '입'
        };
        return zoneNames[zone] || '얼굴 부위';
    }
    
    calculatePopupSize(segment) {
        // 더 큰 크기: 200px x 267px (3:4 비율 유지)
        return {
            width: (this.videoWidth / 2) * (5/6),
            height: (this.videoHeight / 2) * (5/6)
        };
    }
    
    calculateWideSpreadPosition(segment, popupSize) {
        // 화면 중앙 기준으로 얼굴 위치 계산
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        
        // 얼굴 부위별 기본 위치 설정 (실제 사람 얼굴과 비슷하게)
        const facePositions = this.getRealisticFacePositions(segment.zone);
        
        // 화면 전체에 넓게 퍼지게 하기 위해 더 큰 범위 사용
        const spreadWidth = window.innerWidth * 0.8; // 화면의 80% 너비
        const spreadHeight = window.innerHeight * 0.8; // 화면의 80% 높이
        
        // 얼굴 부위별 위치 계산
        let baseX = screenCenterX + (facePositions.x * spreadWidth);
        let baseY = screenCenterY + (facePositions.y * spreadHeight);
        
        // 팝업창이 균일하게 조금씩 겹쳐서 점진적으로 늘어서게 하기
        const spacingOffsetX = (Math.random() - 0.5) * popupSize.width * 0.3; // 더 작은 오프셋으로 균일한 겹침
        const spacingOffsetY = (Math.random() - 0.5) * popupSize.height * 0.3; // 더 작은 오프셋으로 균일한 겹침
        
        baseX += spacingOffsetX;
        baseY += spacingOffsetY;
        
        // 화면 경계 확인 (화면 전체에 퍼지게)
        const margin = 50;
        const minX = margin;
        const maxX = window.innerWidth - popupSize.width - margin;
        const minY = margin;
        const maxY = window.innerHeight - popupSize.height - margin;
        
        return {
            x: Math.max(minX, Math.min(maxX, baseX)),
            y: Math.max(minY, Math.min(maxY, baseY))
        };
    }
    
    getRealisticFacePositions(zone) {
        // 실제 사람 얼굴과 비슷한 위치 매핑 (6등분으로 분할된 눈 영역, 점진적 배치)
        const facePositions = {
            // 왼쪽 눈 6등분 - 점진적으로 퍼지게 배치 (좌우 간격 좁히기)
            leftEye1: { x: -0.5, y: -0.5 },     // 왼쪽 눈 1/6 (-0.6에서 -0.5로)
            leftEye2: { x: -0.35, y: -0.5 },    // 왼쪽 눈 2/6 (-0.4에서 -0.35로)
            leftEye3: { x: -0.2, y: -0.5 },     // 왼쪽 눈 3/6 (유지)
            leftEye4: { x: -0.5, y: -0.3 },     // 왼쪽 눈 4/6 (-0.6에서 -0.5로)
            leftEye5: { x: -0.35, y: -0.3 },    // 왼쪽 눈 5/6 (-0.4에서 -0.35로)
            leftEye6: { x: -0.2, y: -0.3 },     // 왼쪽 눈 6/6 (유지)
            
            // 오른쪽 눈 6등분 - 점진적으로 퍼지게 배치
            rightEye1: { x: 0.2, y: -0.5 },      // 오른쪽 눈 1/6
            rightEye2: { x: 0.4, y: -0.5 },     // 오른쪽 눈 2/6
            rightEye3: { x: 0.6, y: -0.5 },     // 오른쪽 눈 3/6
            rightEye4: { x: 0.2, y: -0.3 },     // 오른쪽 눈 4/6
            rightEye5: { x: 0.4, y: -0.3 },     // 오른쪽 눈 5/6
            rightEye6: { x: 0.6, y: -0.3 },     // 오른쪽 눈 6/6
            
            nose: { x: 0, y: -0.2 },             // 코: 중앙 위쪽
            mouth: { x: 0, y: 0.3 }              // 입: 아래쪽 중앙
        };
        
        return facePositions[zone] || { x: 0, y: 0 };
    }
    
    calculateZIndex(zone) {
        // 얼굴 부위별 z-index 설정 (6등분으로 분할된 눈 영역)
        const zIndexMap = {
            // 왼쪽 눈 6등분
            leftEye1: 1010,     // 왼쪽 눈 1/6
            leftEye2: 1011,     // 왼쪽 눈 2/6
            leftEye3: 1012,     // 왼쪽 눈 3/6
            leftEye4: 1013,     // 왼쪽 눈 4/6
            leftEye5: 1014,     // 왼쪽 눈 5/6
            leftEye6: 1015,     // 왼쪽 눈 6/6
            
            // 오른쪽 눈 6등분
            rightEye1: 1020,     // 오른쪽 눈 1/6
            rightEye2: 1021,     // 오른쪽 눈 2/6
            rightEye3: 1022,     // 오른쪽 눈 3/6
            rightEye4: 1023,     // 오른쪽 눈 4/6
            rightEye5: 1024,     // 오른쪽 눈 5/6
            rightEye6: 1025,     // 오른쪽 눈 6/6
            
            nose: 1030,          // 코
            mouth: 1040          // 입
        };
        
        return zIndexMap[zone] || 1000;
    }
    
    // 필터 적용 함수들 (이미지만 필터 적용, 테두리는 통일)
    applyFilterToPopup(img, filter) {
        filter.apply(img);
    }
    
    applyBlurFilter(img) {
        img.style.filter = 'blur(6px)';
    }
    
    applyDotFilter(img) {
        img.onload = () => {
            // 팝업창의 이미지 컨테이너 크기에 맞춰서 Canvas 크기 설정
            const container = img.closest('.image-container');
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = containerWidth;
            canvas.height = containerHeight;
            
            // 이미지를 컨테이너 크기에 맞춰서 그리기
            ctx.drawImage(img, 0, 0, containerWidth, containerHeight);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const pixelSize = 10; // 픽셀 크기 (10x10 블록)
            
            // 픽셀화 효과 적용
            for (let y = 0; y < canvas.height; y += pixelSize) {
                for (let x = 0; x < canvas.width; x += pixelSize) {
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    // 현재 블록의 평균 색상 계산
                    for (let blockY = y; blockY < Math.min(y + pixelSize, canvas.height); blockY++) {
                        for (let blockX = x; blockX < Math.min(x + pixelSize, canvas.width); blockX++) {
                            const index = (blockY * canvas.width + blockX) * 4;
                            r += data[index];
                            g += data[index + 1];
                            b += data[index + 2];
                            count++;
                        }
                    }
                    
                    // 평균 색상 계산
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                    
                    // 블록 전체를 평균 색상으로 채우기
                    for (let blockY = y; blockY < Math.min(y + pixelSize, canvas.height); blockY++) {
                        for (let blockX = x; blockX < Math.min(x + pixelSize, canvas.width); blockX++) {
                            const index = (blockY * canvas.width + blockX) * 4;
                            data[index] = r;     // R
                            data[index + 1] = g; // G
                            data[index + 2] = b; // B
                            // Alpha는 그대로 유지
                        }
                    }
                }
            }
            
            ctx.putImageData(imageData, 0, 0);
            img.src = canvas.toDataURL();
        };
    }
    
    applyDreamcoreFilter(img) {
        img.style.filter = 'hue-rotate(180deg) saturate(2) contrast(1.5) brightness(1.2)';
    }
    
    applyContrastFilter(img) {
        img.style.filter = 'contrast(1.5) brightness(1.5)';
    }
    
    applySaturateFilter(img) {
        img.style.filter = 'saturate(2)';
    }
    
    applyNeonFilter(img) {
        img.style.filter = 'brightness(1.5) contrast(2) saturate(3) drop-shadow(0 0 10px #00ffff) drop-shadow(0 0 20px #ff00ff)';
    }
    
    applyPsychedelicFilter(img) {
        img.style.filter = 'hue-rotate(90deg) saturate(3) contrast(1.5) brightness(1.3)';
    }
    
    applyThresholdZeroFilter(img) {
        img.onload = () => {
            // 팝업창의 이미지 컨테이너 크기에 맞춰서 Canvas 크기 설정
            const container = img.closest('.image-container');
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = containerWidth;
            canvas.height = containerHeight;
            
            // 이미지를 컨테이너 크기에 맞춰서 그리기
            ctx.drawImage(img, 0, 0, containerWidth, containerHeight);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            const threshold = 120; // GeeksforGeeks 기사에서 사용한 threshold 값
            
            // Threshold Zero 효과 적용 (pixels above threshold are set to 0)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // 그레이스케일 값 계산 (RGB 평균)
                const gray = (r + g + b) / 3;
                
                // threshold보다 높은 픽셀은 0으로 설정 (검은색)
                if (gray >= threshold) {
                    data[i] = 0;     // R
                    data[i + 1] = 0; // G
                    data[i + 2] = 0; // B
                    // Alpha는 그대로 유지
                }
                // threshold보다 낮은 픽셀은 원래 값 유지
            }
            
            ctx.putImageData(imageData, 0, 0);
            img.src = canvas.toDataURL();
        };
    }
    
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        // 헤더와 이미지 컨테이너 모두를 드래그 핸들로 사용
        const header = element.querySelector('.finder-header');
        const imageContainer = element.querySelector('.image-container');
        
        // 헤더 드래그 이벤트
        header.addEventListener('mousedown', dragStart);
        
        // 이미지 컨테이너 드래그 이벤트
        imageContainer.addEventListener('mousedown', dragStart);
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        function dragStart(e) {
            isDragging = true;
            element.style.zIndex = '1001';
            element.style.cursor = 'grabbing';
            
            // 마우스 시작 위치와 팝업창 현재 위치 저장
            startX = e.clientX;
            startY = e.clientY;
            
            // 현재 transform 값에서 위치 추출
            const transform = element.style.transform;
            if (transform && transform !== 'none') {
                const matrix = transform.match(/translate3d\(([^,]+),\s*([^,]+)/);
                if (matrix) {
                    initialX = parseFloat(matrix[1]);
                    initialY = parseFloat(matrix[2]);
                } else {
                    initialX = 0;
                    initialY = 0;
                }
            } else {
                initialX = 0;
                initialY = 0;
            }
            
            e.preventDefault();
        }
        
        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                // 마우스 이동 거리 계산
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                // 새로운 위치 계산
                const newX = initialX + deltaX;
                const newY = initialY + deltaY;
                
                // 즉시 위치 적용
                element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
            }
        }
        
        function dragEnd(e) {
            if (isDragging) {
            isDragging = false;
            element.style.zIndex = '1000';
                element.style.cursor = 'move';
            }
        }
    }
    
    clearPopups() {
        this.popups.forEach(popup => popup.remove());
        this.popups = [];
    }
    
    clearAll() {
        this.clearPopups();
        this.capturedImageData = null;
        
        // 재구성 버튼과 초기화 버튼 비활성화
        this.reconstructBtn.classList.add('disabled');
        this.clearBtn.classList.add('disabled');
        
        // 배경 초기화
        document.body.style.backgroundImage = '';
        
        // 모든 배경 효과 제거
        this.clearAllBackgroundEffects();
        
        // 버튼 애니메이션
        this.clearBtn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.clearBtn.style.transform = '';
        }, 150);
        
        // this.showMessage('🗑️ 모든 데이터가 초기화되었습니다!', 'info');
    }
    
    showMessage(text, type = 'info') {
        // 기존 메시지 제거
        const existingMessage = document.querySelector('.message-toast');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const message = document.createElement('div');
        message.className = `message-toast message-${type}`;
        message.textContent = text;
        
        // 스타일 적용
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 25px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        
        // 타입별 색상
        const colors = {
            success: 'linear-gradient(45deg, #4CAF50, #45a049)',
            info: 'linear-gradient(45deg, #2196F3, #1976D2)',
            warning: 'linear-gradient(45deg, #ff9800, #f57c00)',
            error: 'linear-gradient(45deg, #f44336, #d32f2f)'
        };
        
        message.style.background = colors[type] || colors.info;
        
        document.body.appendChild(message);
        
        // 3초 후 자동 제거
        setTimeout(() => {
            message.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 300);
        }, 3000);
    }
    
    closePopup(popup) {
        // 팝업창을 DOM에서 제거
        if (popup && popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
        
        // 팝업 배열에서도 제거
        const index = this.popups.indexOf(popup);
        if (index > -1) {
            this.popups.splice(index, 1);
        }
        
        console.log('팝업창이 닫혔습니다.');
    }
    
    setBackgroundImage(imageSrc) {
        // 사진 찍기로 찍은 사진을 배경에 꽉 차게 적용
        document.body.style.backgroundImage = `url(${imageSrc})`;
        document.body.style.backgroundSize = 'cover'; // 꽉 차게 표시
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat'; // 반복 없음
        document.body.style.backgroundAttachment = 'fixed'; // 스크롤 시 고정
        
        console.log('배경 이미지가 꽉 차게 적용되었습니다.');
    }
    
    setBackgroundImageRepeat(imageSrc) {
        // 팝업창의 이미지를 배경에 반복되도록 적용
        document.body.style.backgroundImage = `url(${imageSrc})`;
        document.body.style.backgroundSize = 'auto'; // 원본 크기 유지
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'repeat'; // 이미지 반복
        document.body.style.backgroundAttachment = 'fixed'; // 스크롤 시 고정
        
        console.log('배경 이미지가 반복되도록 적용되었습니다.');
    }
    
    setBackgroundRotating3D(popup) {
        // 기존 3D 배경 제거
        const existing3D = document.getElementById('rotating-3d-background');
        if (existing3D) {
            existing3D.remove();
        }
        
        // 팝업창의 이미지 컨테이너를 직접 캡처
        const imageContainer = popup.querySelector('.image-container');
        const img = imageContainer.querySelector('img');
        
        if (!img || !img.src) {
            console.error('이미지를 찾을 수 없습니다.');
            return;
        }
        
        // 이미지를 직접 캔버스에 그려서 필터 적용된 상태로 캡처
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 이미지의 실제 크기 사용
        canvas.width = img.naturalWidth || img.width || 240;
        canvas.height = img.naturalHeight || img.height || 320;
        
        // 필터 복사
        const computedStyle = window.getComputedStyle(img);
        const filter = computedStyle.filter;
        
        // 필터를 Canvas에 적용
        if (filter && filter !== 'none') {
            ctx.filter = filter;
        }
        
        // 이미지를 새로 로드해서 캔버스에 그리기
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => {
            ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
            const imageData = canvas.toDataURL('image/png');
            this.create3DRotatingBackground(imageData);
        };
        tempImg.src = img.src;
    }
    
    create3DRotatingBackground(imageSrc) {
        // 3D 회전 배경 컨테이너 생성
        const container = document.createElement('div');
        container.id = 'rotating-3d-background';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            perspective: 1000px;
            overflow: hidden;
            pointer-events: none;
        `;
        
        // 원기둥 생성 (여러 개의 면으로 구성)
        const cylinder = document.createElement('div');
        cylinder.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: 200vw;
            height: 200vh;
            transform-style: preserve-3d;
            animation: rotate3D 20s linear infinite;
        `;
        
        // 원기둥의 면 개수 (많을수록 부드러운 원기둥)
        const sides = 12; // 20 → 12로 감소 (성능 최적화)
        const angleIncrement = 360 / sides;
        const radius = 800; // 원기둥 반지름
        
        for (let i = 0; i < sides; i++) {
            const face = document.createElement('div');
            const angle = angleIncrement * i;
            
            face.style.cssText = `
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: url(${imageSrc});
                background-size: 12px;
                background-position: center;
                background-repeat: repeat;
                transform: rotateY(${angle}deg) translateZ(${radius}px);
                backface-visibility: visible;
                will-change: transform;
            `;
            
            cylinder.appendChild(face);
        }
        
        container.appendChild(cylinder);
        document.body.appendChild(container);
        
        // CSS 애니메이션 추가
        if (!document.getElementById('rotation-animation-style')) {
            const style = document.createElement('style');
            style.id = 'rotation-animation-style';
            style.textContent = `
                @keyframes rotate3D {
                    from {
                        transform: translate(-50%, -50%) rotateY(0deg);
                    }
                    to {
                        transform: translate(-50%, -50%) rotateY(360deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('3D 회전 배경이 적용되었습니다.');
    }
    
    setBackgroundParticleEffect(popup) {
        // 기존 모든 효과 제거
        this.clearAllBackgroundEffects();
        
        // 팝업창의 이미지 컨테이너를 직접 캡처
        const imageContainer = popup.querySelector('.image-container');
        const img = imageContainer.querySelector('img');
        
        if (!img || !img.src) {
            console.error('이미지를 찾을 수 없습니다.');
            return;
        }
        
        // 파티클 효과 배경 생성
        this.createParticleBackground(img.src);
    }
    
    createParticleBackground(imageSrc) {
        // 파티클 효과 컨테이너
        const container = document.createElement('div');
        container.id = 'particle-background';
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -1;
            overflow: hidden;
            background-image: url(${imageSrc});
            background-size: 340px;
            background-position: center;
            background-repeat: repeat;
            will-change: transform, filter;
        `;
        
        document.body.appendChild(container);
        
        // 개별 타일 애니메이션을 위한 스타일 추가
        if (!document.getElementById('particle-animation-style')) {
            const style = document.createElement('style');
            style.id = 'particle-animation-style';
            style.textContent = `
                #particle-background {
                    animation: none;
                }
                
                #particle-background::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: inherit;
                    background-size: inherit;
                    background-position: inherit;
                    background-repeat: inherit;
                    animation: particleFloat1 3s ease-in-out infinite;
                    will-change: transform, filter;
                }
                
                #particle-background::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-image: inherit;
                    background-size: inherit;
                    background-position: inherit;
                    background-repeat: inherit;
                    animation: particleFloat2 3.5s ease-in-out infinite;
                    will-change: transform, filter;
                }
                
                @keyframes particleFloat1 {
                    0% { 
                        filter: blur(0px) brightness(1) contrast(1);
                        transform: translateY(0px) rotate(0deg);
                    }
                    12.5% { 
                        filter: blur(0.5px) brightness(1.1) contrast(1.05);
                        transform: translateY(-5px) rotate(0.5deg);
                    }
                    25% { 
                        filter: blur(1px) brightness(1.2) contrast(1.1);
                        transform: translateY(-10px) rotate(1deg);
                    }
                    37.5% { 
                        filter: blur(1.5px) brightness(1.3) contrast(1.15);
                        transform: translateY(-15px) rotate(0.5deg);
                    }
                    50% { 
                        filter: blur(2px) brightness(1.4) contrast(1.2);
                        transform: translateY(-20px) rotate(0deg);
                    }
                    62.5% { 
                        filter: blur(1.5px) brightness(1.3) contrast(1.15);
                        transform: translateY(-15px) rotate(-0.5deg);
                    }
                    75% { 
                        filter: blur(1px) brightness(1.2) contrast(1.1);
                        transform: translateY(-10px) rotate(-1deg);
                    }
                    87.5% { 
                        filter: blur(0.5px) brightness(1.1) contrast(1.05);
                        transform: translateY(-5px) rotate(-0.5deg);
                    }
                    100% { 
                        filter: blur(0px) brightness(1) contrast(1);
                        transform: translateY(0px) rotate(0deg);
                    }
                }
                
                @keyframes particleFloat2 {
                    0% { 
                        filter: blur(0px) brightness(1) contrast(1);
                        transform: translateY(0px) rotate(0deg);
                    }
                    15% { 
                        filter: blur(0.3px) brightness(1.05) contrast(1.02);
                        transform: translateY(-3px) rotate(-0.3deg);
                    }
                    30% { 
                        filter: blur(0.8px) brightness(1.15) contrast(1.08);
                        transform: translateY(-8px) rotate(-0.8deg);
                    }
                    45% { 
                        filter: blur(1.2px) brightness(1.25) contrast(1.12);
                        transform: translateY(-12px) rotate(-0.4deg);
                    }
                    60% { 
                        filter: blur(1.8px) brightness(1.35) contrast(1.18);
                        transform: translateY(-18px) rotate(0deg);
                    }
                    75% { 
                        filter: blur(1.2px) brightness(1.25) contrast(1.12);
                        transform: translateY(-12px) rotate(0.4deg);
                    }
                    90% { 
                        filter: blur(0.8px) brightness(1.15) contrast(1.08);
                        transform: translateY(-8px) rotate(0.8deg);
                    }
                    100% { 
                        filter: blur(0px) brightness(1) contrast(1);
                        transform: translateY(0px) rotate(0deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        console.log('개별 파티클 효과가 적용되었습니다!');
    }
    
    clearAllBackgroundEffects() {
        // 모든 배경 효과 제거
        const existing3D = document.getElementById('rotating-3d-background');
        const existingRainbow = document.getElementById('rainbow-background');
        const existingParticle = document.getElementById('particle-background');
        
        if (existing3D) existing3D.remove();
        if (existingRainbow) existingRainbow.remove();
        if (existingParticle) existingParticle.remove();
    }
    
    // 버튼 떠다니기 기능
    startButtonFloating() {
        // 각 버튼의 초기 설정
        const buttons = [
            { element: document.querySelector('.btn-wrapper:nth-child(1)'), vx: 2, vy: 1.5 },
            { element: document.querySelector('.btn-wrapper:nth-child(2)'), vx: -1.5, vy: 2 },
            { element: document.querySelector('.btn-wrapper:nth-child(3)'), vx: 1.8, vy: -1.8 }
        ];
        
        buttons.forEach(btn => {
            if (btn.element) {
                // 버튼을 absolute positioning으로 변경
                btn.element.style.position = 'absolute';
                btn.element.style.left = Math.random() * (window.innerWidth - 400) + 'px';
                btn.element.style.top = Math.random() * (window.innerHeight - 200) + 'px';
                
                this.floatingButtons.push(btn);
            }
        });
        
        this.isFloatingActive = true;
        this.animateFloatingButtons();
    }
    
    animateFloatingButtons() {
        if (!this.isFloatingActive) return;
        
        this.floatingButtons.forEach(btn => {
            const element = btn.element;
            const rect = element.getBoundingClientRect();
            
            // 현재 위치 가져오기
            let x = parseFloat(element.style.left) || 0;
            let y = parseFloat(element.style.top) || 0;
            
            // 새로운 위치 계산
            x += btn.vx;
            y += btn.vy;
            
            // 벽에 부딪히면 방향 전환
            if (x <= 0 || x + rect.width >= window.innerWidth) {
                btn.vx = -btn.vx;
                x = Math.max(0, Math.min(x, window.innerWidth - rect.width));
            }
            
            if (y <= 0 || y + rect.height >= window.innerHeight) {
                btn.vy = -btn.vy;
                y = Math.max(0, Math.min(y, window.innerHeight - rect.height));
            }
            
            // 위치 적용
            element.style.left = x + 'px';
            element.style.top = y + 'px';
        });
        
        requestAnimationFrame(() => this.animateFloatingButtons());
    }
    
}

// 페이지 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
    new FaceReconstruction();
});

// 키보드 단축키
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // ESC 키로 모든 팝업 닫기
        const popups = document.querySelectorAll('.face-popup');
        popups.forEach(popup => popup.remove());
    }
});

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
