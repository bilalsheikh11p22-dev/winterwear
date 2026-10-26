import React from 'react';
import { Ruler, ShieldCheck } from 'lucide-react';

const SizeGuidePage = () => {
  return (
    <div className="min-h-screen bg-charcoal text-snow py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-editorial text-ice font-bold">
            Bespoke Atelier Fit
          </span>
          <h1 className="font-editorial-serif text-3xl sm:text-5xl text-snow font-light">
            Sizing & Fit Architecture
          </h1>
          <p className="text-xs text-silver max-w-lg mx-auto leading-relaxed">
            All WinterWear garments are tailored with generous ease allowances to accommodate winter layering. Measurements are provided in inches and centimeters.
          </p>
        </div>

        {/* Coats & Overcoats Chart */}
        <div className="glass-panel p-6 sm:p-8 rounded border border-white/10 space-y-4">
          <div className="flex items-center gap-2 text-cream font-medium">
            <Ruler className="w-5 h-5" />
            <h3 className="font-editorial-serif text-2xl text-snow">Outerwear & Down Parkas (Chest / Length)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/10 text-silver uppercase tracking-wider">
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chest (Inches)</th>
                  <th className="py-3 px-4">Chest (cm)</th>
                  <th className="py-3 px-4">Sleeve (cm)</th>
                  <th className="py-3 px-4">Shoulder (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-silver-light">
                <tr>
                  <td className="py-3 px-4 font-bold text-snow">XS</td>
                  <td className="py-3 px-4">34 - 36"</td>
                  <td className="py-3 px-4">86 - 91 cm</td>
                  <td className="py-3 px-4">83 cm</td>
                  <td className="py-3 px-4">44 cm</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-snow">S</td>
                  <td className="py-3 px-4">36 - 38"</td>
                  <td className="py-3 px-4">91 - 96 cm</td>
                  <td className="py-3 px-4">85 cm</td>
                  <td className="py-3 px-4">46 cm</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-snow">M</td>
                  <td className="py-3 px-4">38 - 40"</td>
                  <td className="py-3 px-4">96 - 102 cm</td>
                  <td className="py-3 px-4">87 cm</td>
                  <td className="py-3 px-4">48 cm</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-snow">L</td>
                  <td className="py-3 px-4">41 - 43"</td>
                  <td className="py-3 px-4">104 - 109 cm</td>
                  <td className="py-3 px-4">89 cm</td>
                  <td className="py-3 px-4">50 cm</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-bold text-snow">XL</td>
                  <td className="py-3 px-4">44 - 46"</td>
                  <td className="py-3 px-4">112 - 117 cm</td>
                  <td className="py-3 px-4">91 cm</td>
                  <td className="py-3 px-4">52 cm</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Fit Consultation Note */}
        <div className="p-6 bg-charcoal-surface rounded border border-white/5 text-xs text-silver space-y-2">
          <strong className="text-snow block font-semibold">Need Personal Tailoring Guidance?</strong>
          <p>
            If you fall between sizes or plan to wear heavy cable-knit turtlenecks underneath your shearling aviator or double-breasted overcoat, we recommend selecting your true size. For slim metropolitan styling, choose one size down.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SizeGuidePage;
