import './Footer.css'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p className="footer-text">짤 2024 My Work. 모든 권리 보유.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">개인정보처리방침</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">이용약관</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">문의하기</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
