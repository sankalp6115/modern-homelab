import os
import numpy as np
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
from data_loader import image_iterator

# Set plot style for premium dark mode look
plt.style.use('dark_background')

def main():
    # 1. Load embeddings
    embeddings_file = "embeddings.npy"
    if not os.path.exists(embeddings_file):
        print(f"Error: {embeddings_file} not found. Please run classifier.py first.")
        return
        
    X = np.load(embeddings_file)
    print(f"Loaded embeddings matrix: {X.shape}")
    
    # 2. Check if we have image paths to match
    image_dir = "/Users/sankalpomar/Documents/warehouse/ss-classifier"
    image_paths = []
    if os.path.exists(image_dir):
        image_paths = list(image_iterator(image_dir))
        # Ensure we only match the actual number of successfully processed images
        image_paths = image_paths[:len(X)]
        print(f"Found {len(image_paths)} corresponding image paths.")

    # 3. Perform Dimensionality Reduction (t-SNE)
    print("Running t-SNE to reduce to 2D (this might take a few seconds)...")
    tsne = TSNE(n_components=2, random_state=42, perplexity=min(30, len(X) - 1))
    X_2d = tsne.fit_transform(X)
    
    # 4. Perform PCA as a comparison or fallback
    print("Running PCA to reduce to 2D...")
    pca = PCA(n_components=2, random_state=42)
    X_pca = pca.fit_transform(X)
    
    # 5. Create a beautiful 2D Scatter Plot
    fig, axes = plt.subplots(1, 2, figsize=(16, 8), facecolor='#111111')
    fig.suptitle('Image Embeddings Visualization (ViT-B-32 CLIP)', fontsize=18, color='#ffffff', weight='bold')
    
    # Plot t-SNE
    ax_tsne = axes[0]
    ax_tsne.set_facecolor('#111111')
    scatter_tsne = ax_tsne.scatter(
        X_2d[:, 0], X_2d[:, 1], 
        c=np.arange(len(X)), cmap='plasma', 
        alpha=0.7, edgecolors='none', s=25
    )
    ax_tsne.set_title('t-SNE Projection (Best for local clusters)', fontsize=14, color='#ffffff', pad=10)
    ax_tsne.grid(True, color='#222222', linestyle='--', linewidth=0.5)
    ax_tsne.set_xlabel('t-SNE Dimension 1', color='#888888')
    ax_tsne.set_ylabel('t-SNE Dimension 2', color='#888888')
    
    # Plot PCA
    ax_pca = axes[1]
    ax_pca.set_facecolor('#111111')
    scatter_pca = ax_pca.scatter(
        X_pca[:, 0], X_pca[:, 1], 
        c=np.arange(len(X)), cmap='plasma', 
        alpha=0.7, edgecolors='none', s=25
    )
    ax_pca.set_title('PCA Projection (Best for global variance)', fontsize=14, color='#ffffff', pad=10)
    ax_pca.grid(True, color='#222222', linestyle='--', linewidth=0.5)
    ax_pca.set_xlabel('PCA Dimension 1', color='#888888')
    ax_pca.set_ylabel('PCA Dimension 2', color='#888888')
    
    # Add a sleek colorbar to show image sequence/index
    cbar = fig.colorbar(scatter_tsne, ax=axes.ravel().tolist(), shrink=0.8, pad=0.03)
    cbar.set_label('Image Index (Temporal order)', color='#ffffff', fontsize=12)
    cbar.ax.yaxis.set_tick_params(color='#ffffff')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='#ffffff')
    
    # Save the static plot
    output_png = "embeddings_vis.png"
    plt.savefig(output_png, dpi=300, facecolor='#111111', bbox_inches='tight')
    print(f"Saved static 2D visualization plot to: {output_png}")
    plt.close()
    
    # 6. Attempt to generate an interactive HTML file with Plotly
    try:
        import plotly.express as px
        import pandas as pd
        
        print("Generating interactive Plotly HTML visualization...")
        
        # Prepare dataframe
        df = pd.DataFrame({
            'x': X_2d[:, 0],
            'y': X_2d[:, 1],
            'index': np.arange(len(X)),
            'filename': [os.path.basename(p) if image_paths else f"Image {i}" for i, p in enumerate(image_paths)] if len(image_paths) == len(X) else [f"Image {i}" for i in range(len(X))]
        })
        
        fig_plotly = px.scatter(
            df, x='x', y='y', 
            hover_data=['index', 'filename'],
            color='index',
            color_continuous_scale='Plasma',
            title='Interactive t-SNE Embeddings Visualization'
        )
        
        # Style Plotly for dark mode
        fig_plotly.update_layout(
            template='plotly_dark',
            plot_bgcolor='#111111',
            paper_bgcolor='#111111',
            font=dict(color='#ffffff')
        )
        
        output_html = "embeddings_vis.html"
        fig_plotly.write_html(output_html)
        print(f"Saved interactive HTML visualization to: {output_html}")
        
    except ImportError:
        print("\nNote: Install 'plotly' and 'pandas' to also generate an interactive HTML plot where you can hover over points to see image filenames:")
        print("pip install plotly pandas")

if __name__ == "__main__":
    main()
