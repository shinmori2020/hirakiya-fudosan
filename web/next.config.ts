import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * /contact の Server Action は実行時に data/properties/index.json を読み直す(J-102 e:クライアントの表示を信用しない)。
   * 静的生成の時と違い、fs で動的に読むファイルは配備物に含まれないことがあるので、明示して同梱する。これは初案。
   */
  outputFileTracingIncludes: {
    '/contact': ['./data/properties/index.json'],
  },
};

export default nextConfig;
