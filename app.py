import streamlit as st
import pandas as pd

# ページ設定（スマホで見やすいセンタリング表示）
st.set_page_config(page_title="商品JAN検索アプリ", page_icon="📦", layout="centered")

st.title("📦 商品JANコード検索")

# マスタデータの読み込み（キャッシュ化して高速表示）
@st.cache_data
def load_data():
    # 元のエクセルファイルのD〜G列（商品マスタ）を読み込み
    df = pd.read_excel("アイリスチェック のコピー のコピー.xlsx", sheet_name="シート1", usecols="D:G")
    df.columns = ["JANコード", "名称", "単価", "消費税"]
    
    # データを整形（数値の表記揺れ防止）
    df = df.dropna(subset=["JANコード"]).copy()
    df["JANコード"] = df["JANコード"].astype(str).str.replace(r"\.0$", "", regex=True).str.strip()
    return df

try:
    df = load_data()
    
    # 検索入力欄（数値キーボードが出やすいよう処理）
    jan_input = st.text_input("JANコードを入力またはスキャン", value="", placeholder="例: 10001035").strip()

    if jan_input:
        # JANコードで検索
        result = df[df["JANコード"] == jan_input]
        
        if not result.empty:
            item = result.iloc[0]
            st.success("✅ 商品が見つかりました")
            
            # 結果をカード状に表示
            st.subheader(f"商品名: {item['名称']}")
            
            col1, col2 = st.columns(2)
            price = int(item['単価']) if pd.notna(item['単価']) else 0
            tax = int(item['消費税']) if pd.notna(item['消費税']) else 10
            
            col1.metric("単価（税抜）", f"¥{price:,}")
            col2.metric("消費税率", f"{tax}%")
            
        else:
            st.error("❌ 該当する商品が見つかりませんでした。")

    # 全商品一覧の確認アコーディオン
    with st.expander("登録済み商品一覧を確認（全件）"):
        st.dataframe(df, hide_index=True, use_container_width=True)

except Exception as e:
    st.error(f"ファイルの読み込みに失敗しました: {e}")