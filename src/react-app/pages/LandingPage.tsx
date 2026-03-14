import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden text-white text-center"
        style={{ background: "linear-gradient(135deg, #8B0000 0%, #5A0000 50%, #3A0000 100%)" }}>
        {/* Islamic geometric pattern overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            opacity: 0.06,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1'%3E%3Cpolygon points='60,5 95,30 95,75 60,100 25,75 25,30'/%3E%3Cpolygon points='60,20 82,35 82,70 60,85 38,70 38,35'/%3E%3Cline x1='60' y1='5' x2='60' y2='20'/%3E%3Cline x1='95' y1='30' x2='82' y2='35'/%3E%3Cline x1='95' y1='75' x2='82' y2='70'/%3E%3Cline x1='60' y1='100' x2='60' y2='85'/%3E%3Cline x1='25' y1='75' x2='38' y2='70'/%3E%3Cline x1='25' y1='30' x2='38' y2='35'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-[900px] mx-auto px-5 py-24 md:py-32">
          {/* Bismillah */}
          <p className="text-lg md:text-xl opacity-60 mb-6 tracking-wider" style={{ fontFamily: "'Amiri', serif" }}>
            بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
          </p>

          {/* Main Arabic title */}
          <h1 className="text-5xl md:text-7xl mb-4 font-normal tracking-wider text-white"
            style={{ fontFamily: "'Amiri', serif" }}>
            &#1582;&#1578;&#1605; &#1575;&#1604;&#1602;&#1585;&#1570;&#1606;
          </h1>

          <h2 className="text-2xl md:text-3xl font-light text-white/90 mb-6"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Khatm al-Quran
          </h2>

          <p className="text-base md:text-lg text-white/70 max-w-[600px] mx-auto mb-10 leading-relaxed">
            Come together as a community to complete the recitation of the entire Quran.
            Coordinate, track progress, and celebrate each milestone together.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/khatam"
              className="bg-white text-[#8B0000] no-underline px-8 py-3.5 rounded-full text-base font-semibold shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 inline-block">
              Start Reading
            </Link>
            <Link to="/metrics"
              className="bg-transparent border-2 border-white/40 text-white no-underline px-8 py-3 rounded-full text-base font-medium hover:bg-white/10 hover:border-white/60 transition-all duration-200 inline-block">
              View Metrics
            </Link>
          </div>
        </div>

        {/* Bottom wave decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 40L48 35C96 30 192 20 288 18.7C384 17.3 480 24.7 576 30C672 35.3 768 38.7 864 36.7C960 34.7 1056 27.3 1152 25.3C1248 23.3 1344 26.7 1392 28.3L1440 30V80H1392C1344 80 1248 80 1152 80C1056 80 960 80 864 80C768 80 672 80 576 80C480 80 384 80 288 80C192 80 96 80 48 80H0V40Z"
              fill="#F3F3F3" />
          </svg>
        </div>
      </section>

      {/* Objective Section */}
      <section className="py-16 md:py-20 px-5 bg-[#F3F3F3]">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="text-sm uppercase tracking-[4px] text-[#8B0000] font-medium mb-3">Our Mission</p>
          <h2 className="text-3xl md:text-4xl mb-6"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
            Complete the Quran Together
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed max-w-[700px] mx-auto">
            Khatm al-Quran is a beautiful tradition where community members divide the 30 Juz (sections) of the
            Quran among themselves, each reading their assigned portion. Together, the entire Quran is completed
            as a collective act of worship — strengthening bonds and earning shared reward.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20 px-5 bg-white">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm uppercase tracking-[4px] text-[#8B0000] font-medium mb-3">Simple Process</p>
            <h2 className="text-3xl md:text-4xl" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: "1", title: "Choose a Quarter", desc: "Browse the 30 Juz and tap any available quarter to claim it for your recitation.", icon: "📖" },
              { num: "2", title: "Enter Your Name", desc: "Provide your name so others can see the quarter is taken and track community progress.", icon: "✏️" },
              { num: "3", title: "Recite Your Portion", desc: "Read your claimed quarter of the Quran at your own pace, with sincerity and reflection.", icon: "🤲" },
              { num: "4", title: "Mark Complete", desc: "When finished, mark your portion as complete. Together, we complete the entire Quran!", icon: "✅" },
            ].map(step => (
              <div key={step.num} className="bg-[#FAFAFA] rounded-2xl p-7 text-center hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                <div className="text-3xl mb-4">{step.icon}</div>
                <div className="w-8 h-8 rounded-full bg-[#8B0000] text-white flex items-center justify-center text-sm font-bold mx-auto mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}>
                  {step.num}
                </div>
                <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}>
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features / Info Cards */}
      <section className="py-16 md:py-20 px-5 bg-[#F3F3F3]">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-[#E8F5E9] rounded-xl flex items-center justify-center text-xl mb-5">🕌</div>
              <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Community Driven</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Designed for masjids, halaqas, families, and friend groups to organize Quran completions together.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-[#FFF8E1] rounded-xl flex items-center justify-center text-xl mb-5">📊</div>
              <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Real-time Tracking</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Watch progress unfold in real-time with a beautiful metrics dashboard perfect for screen sharing.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="w-12 h-12 bg-[#FFF5F5] rounded-xl flex items-center justify-center text-xl mb-5">🔄</div>
              <h3 className="text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>Multiple Khatams</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Complete one Khatam and seamlessly begin the next. Track how many your community has finished.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-white text-center px-5 py-20"
        style={{ background: "linear-gradient(135deg, #5A0000, #3A0000)" }}>
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            Ready to Begin?
          </h2>
          <p className="text-white/60 mb-8 text-base leading-relaxed">
            Join your community in completing the Quran. Every verse counts, every reader matters.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/khatam"
              className="bg-white text-[#8B0000] no-underline px-8 py-3.5 rounded-full text-base font-semibold shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 inline-block">
              Go to Tracker
            </Link>
            <Link to="/metrics"
              className="bg-transparent border-2 border-white/30 text-white no-underline px-8 py-3 rounded-full text-base font-medium hover:bg-white/10 hover:border-white/50 transition-all duration-200 inline-block">
              View Metrics
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
