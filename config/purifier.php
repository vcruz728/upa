<?php
/**
 * Configuración de HTMLPurifier para Laravel
 *
 * Documentación: http://htmlpurifier.org/live/configdoc/plain.html
 */

return [
    'encoding'           => 'UTF-8',
    'finalize'           => true,
    'ignoreNonStrings'   => false,
    'cachePath'          => storage_path('app/purifier'),
    'cacheFileMode'      => 0755,

    'settings'      => [
        // PERFIL DEFAULT (se mantiene como estaba)
        'default' => [
            'HTML.Doctype'             => 'HTML 4.01 Transitional',
            'HTML.Allowed'             => 'div,b,strong,i,em,u,a[href|title],ul,ol,li,p[style],br,span[style],img[width|height|alt|src]',
            'CSS.AllowedProperties'    => 'font,font-size,font-weight,font-style,font-family,text-decoration,padding-left,color,background-color,text-align',
            'AutoFormat.AutoParagraph' => true,
            'AutoFormat.RemoveEmpty'   => true,
        ],

        // PERFIL DE PRUEBA
        'test'    => [
            'Attr.EnableID' => 'true',
        ],

        // PERFIL PARA VIDEOS (YouTube/Vimeo)
        "youtube" => [
            "HTML.SafeIframe"      => 'true',
            "URI.SafeIframeRegexp" => "%^(http://|https://|//)(www.youtube.com/embed/|player.vimeo.com/video/)%"
        ],

        // DEFINICIONES PERSONALIZADAS (html5, video, etc.)
        'custom_definition' => [
            'id'  => 'html5-definitions',
            'rev' => 1,
            'debug' => false,
            'elements' => [
                ['section', 'Block', 'Flow', 'Common'],
                ['nav',     'Block', 'Flow', 'Common'],
                ['article', 'Block', 'Flow', 'Common'],
                ['aside',   'Block', 'Flow', 'Common'],
                ['header',  'Block', 'Flow', 'Common'],
                ['footer',  'Block', 'Flow', 'Common'],
                ['address', 'Block', 'Flow', 'Common'],
                ['hgroup', 'Block', 'Required: h1 | h2 | h3 | h4 | h5 | h6', 'Common'],
                ['figure', 'Block', 'Optional: (figcaption, Flow) | (Flow, figcaption) | Flow', 'Common'],
                ['figcaption', 'Inline', 'Flow', 'Common'],
                ['video', 'Block', 'Optional: (source, Flow) | (Flow, source) | Flow', 'Common', [
                    'src' => 'URI',
                    'type' => 'Text',
                    'width' => 'Length',
                    'height' => 'Length',
                    'poster' => 'URI',
                    'preload' => 'Enum#auto,metadata,none',
                    'controls' => 'Bool',
                ]],
                ['source', 'Block', 'Flow', 'Common', [
                    'src' => 'URI',
                    'type' => 'Text',
                ]],
                ['s',    'Inline', 'Inline', 'Common'],
                ['var',  'Inline', 'Inline', 'Common'],
                ['sub',  'Inline', 'Inline', 'Common'],
                ['sup',  'Inline', 'Inline', 'Common'],
                ['mark', 'Inline', 'Inline', 'Common'],
                ['wbr',  'Inline', 'Empty', 'Core'],
                ['ins', 'Block', 'Flow', 'Common', ['cite' => 'URI', 'datetime' => 'CDATA']],
                ['del', 'Block', 'Flow', 'Common', ['cite' => 'URI', 'datetime' => 'CDATA']],
            ],
            'attributes' => [
                ['iframe', 'allowfullscreen', 'Bool'],
                ['table', 'height', 'Text'],
                ['td', 'border', 'Text'],
                ['th', 'border', 'Text'],
                ['tr', 'width', 'Text'],
                ['tr', 'height', 'Text'],
                ['tr', 'border', 'Text'],
            ],
        ],

        // ATRIBUTOS PERSONALIZADOS
        'custom_attributes' => [
            ['a', 'target', 'Enum#_blank,_self,_target,_top'],
        ],

        // ELEMENTOS PERSONALIZADOS
        'custom_elements' => [
            ['u', 'Inline', 'Inline', 'Common'],
        ],

        // PERFIL ESPECIAL PARA SUNEDITOR (el que vas a usar en tus respuestas)
        'suneditor' => [
            'HTML.Doctype' => 'HTML 4.01 Transitional',
            'HTML.Allowed' => implode(',', [
                'p','br','strong','b','em','i','u','s',
                'ul','ol','li',
                'h1','h2','h3','h4','h5','h6',
                'table','thead','tbody','tfoot','tr','th','td[colspan|rowspan]',
                'a[href|target|rel]'
            ]),
            'AutoFormat.RemoveEmpty' => true,
            'AutoFormat.AutoParagraph' => false,
            'CSS.AllowedProperties' => '',       // ❌ sin estilos inline
            'Attr.AllowedClasses' => '',         // ❌ elimina class="MsoNormal"
            'Attr.AllowedFrameTargets' => ['_blank'],
            'HTML.Nofollow' => true,
            'HTML.TargetBlank' => true,
            'URI.AllowedSchemes' => ['http','https','mailto'],
        ],
    ],
];
