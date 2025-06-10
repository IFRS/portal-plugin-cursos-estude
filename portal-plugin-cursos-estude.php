<?php
/**
 * Plugin Name: IFRS Cursos Estude
 * Description: Disponibiliza um bloco do WordPress que pega Cursos do site Estude no IFRS.
 * Version: 1.0
 * Author: Ricardo Moro
 * Author URI: https://github.com/ricardomoro
 */

if ( ! defined( 'ABSPATH' ) ) {
  exit; // Proteção contra acesso direto.
}

// Registrar o bloco
add_action( 'init', function() {
  wp_register_script(
    'portal-plugin-cursos-estude_block-editor',
    plugins_url( 'block.js', __FILE__ ),
    array( 'wp-blocks', 'wp-element', 'wp-editor', 'wp-components' ),
    filemtime( plugin_dir_path( __FILE__ ) . 'block.js' )
  );

  // wp_register_style(
  //   'portal-plugin-cursos-estude_block-style',
  //   plugins_url( 'style.css', __FILE__ ),
  //   array(),
  //   filemtime( plugin_dir_path( __FILE__ ) . 'style.css' )
  // );

  register_block_type( 'ifrs/cursos-estude', array(
    'editor_script' => 'portal-plugin-cursos-estude_block-editor',
    // 'style'         => 'portal-plugin-cursos-estude_block-style',
    'render_callback' => 'ifrs_render_cursos_block',
    'attributes'    => array(
      'endpoint' => array(
        'type' => 'string',
        'default' => '',
      ),
    ),
  ) );
} );

// Callback para renderizar o bloco
function ifrs_render_cursos_block( $attributes ) {
  $endpoint = isset( $attributes['endpoint'] ) ? esc_url( $attributes['endpoint'] ) : '';
  $unidades = isset( $attributes['unidades'] ) ? $attributes['unidades'] : array();
  $modalidades = isset( $attributes['modalidades'] ) ? $attributes['modalidades'] : array();
  $niveis = isset( $attributes['niveis'] ) ? $attributes['niveis'] : array();

  if ( empty( $endpoint ) ) {
    return '<div class="cursos-erro">Endpoint n&atilde;o configurado.</div>';
  }

  // Monta a chave do cache
  $cache_key = 'ifrs_cursos_' . md5( $endpoint );
  // Tenta ler do transient
  $cursos = get_transient( $cache_key );

  if ( false === $cursos ) {
    // Se não houver cache, faz a requisição

    $url = $endpoint . '/wp-json/wp/v2/cursos?_embed&per_page=5&orderby=rand';

    if ( ! empty( $unidades ) ) {
      $url .= '&unidade=' . implode( ',', array_map( 'sanitize_text_field', $unidades ) );
    }
    if ( ! empty( $modalidades ) ) {
      $url .= '&modalidade=' . implode( ',', array_map( 'sanitize_text_field', $modalidades ) );
    }
    if ( ! empty( $niveis ) ) {
      $url .= '&nivel=' . implode( ',', array_map( 'sanitize_text_field', $niveis ) );
    }

    $response = wp_remote_get( esc_url_raw( $url ) );

    if ( is_wp_error( $response ) ) {
      return '<div class="cursos-erro">Erro ao buscar dados do endpoint.</div>';
    }

    $data   = wp_remote_retrieve_body( $response );
    $cursos = json_decode( $data );

    // Salva no transient por 15 minutos em produção ou 10 segundos em debug
    set_transient( $cache_key, $cursos, WP_DEBUG ? 10 : MINUTE_IN_SECONDS * 15 );
  }

  // Retornar o HTML com os dados
  ob_start();
?>
  <div class="cursos">
    <?php foreach ($cursos as $key => $curso) : ?>
      <?php
        $link = isset( $curso->link ) ? esc_url( $curso->link ) : '';
        $title = isset( $curso->title->rendered ) ? esc_html( $curso->title->rendered ) : '';

        $terms = isset( $curso->_embedded->{"wp:term"} ) ? $curso->_embedded->{"wp:term"} : array();

        $ch = isset( $curso->meta_box->_curso_carga_horaria ) ? $curso->meta_box->_curso_carga_horaria : null;
        $duracao = isset( $curso->meta_box->_curso_duracao ) ? $curso->meta_box->_curso_duracao : null;

        $modalidades = array();
        $campi = array();
        $niveis = array();

        foreach ( $terms as $term ) {
          foreach ( $term as $item ) {
            if ( $item->taxonomy === 'modalidade' ) {
              $modalidades[] = $item->name;
            }

            if ( $item->taxonomy === 'unidade' ) {
              $campi[] = $item->name;
            }

            if ( $item->taxonomy === 'nivel' ) {
              $niveis[] = $item->name;
            }
          }
        }
      ?>
      <a class="curso" href="<?php echo esc_url( $link ); ?>" target="_blank" rel="noopener noreferrer">
        <p class="curso__campus"><?php echo esc_html( implode(', ', $campi) ); ?></p>
        <h3 class="curso__titulo"><?php echo esc_html( $title ); ?></h3>
        <p class="curso__meta">
          <?php echo esc_html( implode(' / ', $niveis) ) ?>
        </p>
        <p class="curso__meta curso__meta">
          <?php echo esc_html( implode(', ', $modalidades) ); ?>
          <?php if ($duracao) : ?>
            -
            <?php echo esc_html( $duracao ); ?>

            <?php if ($ch) : ?>
              (<?php echo esc_html( $ch . 'h' ); ?>)
            <?php endif; ?>
          <?php endif; ?>
        </p>
      </a>
    <?php endforeach; ?>

    <a class="curso curso--todos" href="<?php echo esc_url( $endpoint ); ?>" target="_blank" rel="noopener noreferrer">
      <h3 class="curso__titulo">Conhe&ccedil;a todos os Cursos</h3>
    </a>
  </div>
<?php
  return ob_get_clean();
}
