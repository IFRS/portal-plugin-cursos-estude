import { registerBlockType } from '@wordpress/blocks';
import {
  useBlockProps,
  InspectorControls
} from '@wordpress/block-editor';
import {
  __experimentalSpacer as Spacer,
  Button,
  Flex,
  FlexItem,
  Icon,
  Notice,
  PanelBody,
  SelectControl,
  TextControl,
} from '@wordpress/components';
import { link } from '@wordpress/icons';
import { useState, useEffect } from '@wordpress/element';

registerBlockType('ifrs/cursos-estude', {
  title: 'Cursos do Guia de Cursos',
  description: 'Bloco para exibir cursos do Guia de Cursos.',
  icon: <svg xmlns="http://www.w3.org/2000/svg" height="24" width="30" viewBox="0 0 640 512"><path d="M320 32c-8.1 0-16.1 1.4-23.7 4.1L15.8 137.4C6.3 140.9 0 149.9 0 160s6.3 19.1 15.8 22.6l57.9 20.9C57.3 229.3 48 259.8 48 291.9l0 28.1c0 28.4-10.8 57.7-22.3 80.8c-6.5 13-13.9 25.8-22.5 37.6C0 442.7-.9 448.3 .9 453.4s6 8.9 11.2 10.2l64 16c4.2 1.1 8.7 .3 12.4-2s6.3-6.1 7.1-10.4c8.6-42.8 4.3-81.2-2.1-108.7C90.3 344.3 86 329.8 80 316.5l0-24.6c0-30.2 10.2-58.7 27.9-81.5c12.9-15.5 29.6-28 49.2-35.7l157-61.7c8.2-3.2 17.5 .8 20.7 9s-.8 17.5-9 20.7l-157 61.7c-12.4 4.9-23.3 12.4-32.2 21.6l159.6 57.6c7.6 2.7 15.6 4.1 23.7 4.1s16.1-1.4 23.7-4.1L624.2 182.6c9.5-3.4 15.8-12.5 15.8-22.6s-6.3-19.1-15.8-22.6L343.7 36.1C336.1 33.4 328.1 32 320 32zM128 408c0 35.3 86 72 192 72s192-36.7 192-72L496.7 262.6 354.5 314c-11.1 4-22.8 6-34.5 6s-23.5-2-34.5-6L143.3 262.6 128 408z"/></svg>,
  category: 'widgets',

  attributes: {
    endpoint:    { type: 'string', default: '' },
    unidades:    { type: 'array', default: [] },
    modalidades: { type: 'array', default: [] },
    niveis:      { type: 'array', default: [] },
  },

  edit({ attributes, setAttributes }) {
    const { endpoint, unidades, modalidades, niveis } = attributes;

    // estado local para input e validação
    const [endpointInput, setEndpointInput] = useState(endpoint);
    const [isLoading, setIsLoading]         = useState(false);
    const [isValid, setIsValid]             = useState(!!endpoint);
    const [error, setError]                 = useState(null);

    // dados carregados
    const [unidadesAll, setUnidadesAll]       = useState([]);
    const [modalidadesAll, setModalidadesAll] = useState([]);
    const [niveisAll, setNiveisAll]           = useState([]);

    // helper para opções de select
    const opts = list => list.map(i => ({ label: i.name, value: i.id }));

    // Verifica se o endpoint é uma URL válida
    const validateEndpoint = async (url) => {
      const requiredRoutes = [
        '/wp/v2/unidade',
        '/wp/v2/modalidade',
        '/wp/v2/nivel'
      ];

      try {
        const response = await fetch(`${url}wp-json`);

        if (!response.ok) {
          return false;
        }

        const data = await response.json();

        if (typeof data.routes !== 'object' || data.routes === null) {
          console.log(typeof data.routes, data.routes);

          return false;
        }

        if (Object.keys(data.routes).includes('/wp/v2/cursos') &&
            Object.keys(data.routes).includes('/wp/v2/unidade') &&
            Object.keys(data.routes).includes('/wp/v2/modalidade') &&
            Object.keys(data.routes).includes('/wp/v2/nivel')) {
          return true;
        } else {
          console.error('Rotas necessárias não encontradas:', Object.keys(data.routes));
          return false;
        }
      } catch (e) {
        console.error('Erro ao validar endpoint:', e);
        return false;
      }
    };

    // função para buscar dados do endpoint
    const getDataFromEndpoint = async () => {
      const unidadeResponse = await fetch(`${endpoint}wp-json/wp/v2/unidade?per_page=100&_fields=id,name`);
      const unidadesData = await unidadeResponse.json();
      setUnidadesAll(unidadesData || []);

      const modalidadeResponse = await fetch(`${endpoint}wp-json/wp/v2/modalidade?per_page=100&_fields=id,name`);
      const modalidadesData = await modalidadeResponse.json();
      setModalidadesAll(modalidadesData || []);

      const nivelResponse = await fetch(`${endpoint}wp-json/wp/v2/nivel?per_page=100&_fields=id,name`);
      const niveisData = await nivelResponse.json();
      setNiveisAll(niveisData || []);
    }

    const confirmEndpoint = async () => {
      let ep = endpointInput.trim();
      if (!ep) return;
      if (!ep.endsWith('/')) ep += '/';

      setIsLoading(true);
      setError(null);

      if (await validateEndpoint(ep)) {
        setAttributes({ endpoint: ep });
        setIsValid(true);
      } else {
        setError('Endpoint inválido. Verifique a URL e tente novamente.');
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      try {
        await getDataFromEndpoint();

      } catch {
        setError('Não foi possível buscar os dados.');
        setIsValid(false);
      } finally {
        setIsLoading(false);
      }
    };

    // dispara busca inicial se já existir endpoint
    useEffect(() => {
      if (!endpoint) return;

      setIsLoading(true);
      setError(null);

      (async () => {
        try {
          await getDataFromEndpoint();
          setIsValid(true);
        } catch {
          setError('Não foi possível recuperar dados da API. Verifique o endpoint.');
          setIsValid(false);
        } finally {
          setIsLoading(false);
        }
      })();
    }, [endpoint]);

    return (
      <div {...useBlockProps()}>
        <Flex align="center" justify="start">
          <FlexItem>
            <Icon icon={ link } />
          </FlexItem>
          <FlexItem isBlock={true}>
            <TextControl
              __nextHasNoMarginBottom
              __next40pxDefaultSize
              label="Endpoint"
              hideLabelFromVision={true}
              value={endpointInput}
              onChange={setEndpointInput}
              placeholder="URL do Endpoint, por exemplo: https://estude.ifrs.edu.br/"
            />
          </FlexItem>
          <FlexItem>
            <Button
              __next40pxDefaultSize
              variant="primary"
              onClick={confirmEndpoint}
              disabled={isLoading || !endpointInput.trim()}
              isBusy={isLoading}
            >
              Confirmar Endpoint
            </Button>
          </FlexItem>
        </Flex>
        {error && (
          <Notice
            status="error"
            isDismissible={false}
          >
            {error}
          </Notice>
        )}

        {isValid && (
          <InspectorControls>
            <PanelBody title="Filtros">
              <SelectControl
                __nextHasNoMarginBottom
                multiple
                label="Unidades"
                value={unidades}
                options={opts(unidadesAll)}
                onChange={unidadesSelected => setAttributes({ unidades: unidadesSelected })}
              />
              <Button
                variant="link"
                onClick={() => setAttributes({ unidades: [] })}
              >
                Desmarcar todas as Unidades
              </Button>

              <Spacer marginY="10" />

              <SelectControl
                __nextHasNoMarginBottom
                multiple
                label="Modalidades"
                value={modalidades}
                options={opts(modalidadesAll)}
                onChange={modalidadesSelected => setAttributes({ modalidades: modalidadesSelected })}
              />
              <Button
                variant="link"
                onClick={() => setAttributes({ modalidades: [] })}
              >
                Desmarcar todas as Modalidades
              </Button>

              <Spacer marginY="10" />

              <SelectControl
                __nextHasNoMarginBottom
                multiple
                label="Níveis"
                value={niveis}
                options={opts(niveisAll)}
                onChange={niveisSelected => setAttributes({ niveis: niveisSelected })}
              />
              <Button
                variant="link"
                onClick={() => setAttributes({ niveis: [] })}
              >
                Desmarcar todos os Níveis
              </Button>
            </PanelBody>
          </InspectorControls>
        )}
      </div>
    );
  },

  save() {
    return null;
  },
});
