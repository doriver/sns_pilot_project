# ‘작은 SNS’ 의 기술스택 변경 및 고도화를 위한 Pilot Project
* '작은 SNS'의 SpringBoot + MySQL 이던 기술스택을 Express.js + MongoDB로 변환하고, 클라우드에 올리기위한 초석이될 Pilot Project
* 소규모로 먼저 Express.js + MongoDB 기반 SNS를 구현하면서 기술스택 학습
* Claude Code 적극 활용

## Claude와의 대화 , 그리고 플러스 알파
### 첫번째 딸깍
<details>
  <summary>딸깍 까지의 prompt</summary>
  <div>
    <ul>
      <li> 특정md파일(내가 미리 대략적인 계획을 작성해놈)을 보고 상세 구현계획을 작성해줘
      </li>
      <li>계획대로 구현해줘
      </li>
      <li>이 프로젝트에서 사용한 Express, MongoDB쪽 학습에 도움될만한것들을 정리해서 docs/claude에 md파일로 만들어줘
      </li>
    </ul>
  </div>
</details>
<details>
  <summary>딸깍 코드 실행 결과</summary>
  <div>
    <ul>
      <li>딸깍한 코드 실제로 실행해보니, 작동은함, 하지만 나의 의도와는 많이 달랐음
      </li>
    </ul>
  </div>
</details>
<details>
  <summary>느낀점</summary>
  <div>
    <ul>
      <li>언어의 아주 작은 차이에따라 결과가 달라짐<br>
      첫번째 프롬프트를 하면, 내가 미리 대략적인 계획을 작성해논 계획에 추가로 살을 붙여서 상세계획을 세울줄 알았음<br>
      근데 그냥 대략 짜논 계획대로만 만들어놈
      </li>
    </ul>
  </div>
</details>

## 소프트웨어 정보
* 게시판과 단체채팅기능이 있는 sns
* 기술스택 : Express.js + MongoDB


## Claude Code 관련
<details>
  <summary>대화(세션)중에 특정 질문과 대답을 context에서 제거하고 싶었음</summary>
  <div>
    <ul>
      <li>양질의 결과와 토큰절약을 위해 context관리가 중요함
      </li>
      <li>프롬프트로 해달라고 하니, 모델 측에서 "이 부분만 지워줘"가 불가능 하다는 답변
      </li>
      <li>/compact [지시문] 사용 권고 <br>
      예: /compact ~~ 는 제외하고 요약해줘. <br>
      그러면 그 부분이 요약본에서 빠진 상태로 새 컨텍스트가 만들어진다고 함
      </li>
    </ul>
  </div>
</details>


