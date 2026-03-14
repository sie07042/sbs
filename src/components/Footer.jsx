import './Footer.css'
import { useLanguage } from '../hooks/useLanguage'

function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p className="footer-text">{t('footerCopyright')}</p>
          <div className="footer-links">
            <a href="#" className="footer-link">{t('footerPrivacy')}</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">{t('footerTerms')}</a>
            <span className="footer-separator">|</span>
            <a href="#" className="footer-link">{t('footerContact')}</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
