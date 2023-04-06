<?php

// die($_SERVER['HTTP_HOST']);

// convenience function for redirection headers
function redirect($url) {
    header('HTTP/1.1 307 Temporary Redirect');
    header('Location: ' . $url . $_SERVER['REQUEST_URI']);
    die();
}

// convenience function for checking host for words
function contains($word) {
    $pos = strpos($_SERVER['HTTP_HOST'], $word);
    if ($pos === false)
        return false;
    else return true;
}

// split domain
$host = explode('.', $_SERVER['HTTP_HOST']);
if (count($host) > 2) $sub = $host[count($host) - 3];
if (count($host) > 1) $domain = $host[count($host) - 2];
if (count($host) > 0) $tld = $host[count($host) - 1];

// domain redirects
if (isset($domain)) {
    // function for homesite redirection
    function anuv() {
        global $sub;
        if ($sub == 'ec2') redirect('http://aws.anuv.me');
        elseif ($sub == 'github') redirect('https://github.com/anuvgupta');
    }
    // freenom redirects (.ml, .tk, .ga, .gq, .cf)
    if ($tld == 'ml' || $tld == 'tk' || $tld == 'ga' || $tld == 'gq' || $tld == 'cf') {
        // global github redirects
        if (isset($sub) && $sub == 'github') {
            if ($domain == 'slop') redirect('https://github.com/anuvgupta/slop.ml');
            elseif ($domain == 'chessroom') redirect('https://github.com/anuvgupta/chessroom.ml');
        }
        // anuv/anuvgupta redirects
        if ($domain == 'anuv' || $domain == 'anuvgupta') anuv();
        // sfgpa/sfhs redirects
        if ($domain == 'sfgpa' || $domain == 'sfhs') {
            if (isset($sub)) {
                if ($sub == 'github') redirect('https://github.com/anuvgupta/sfgpa');
            }
            redirect('http://github.anuv.me/sfgpa');
        }
    }
    // .me redirects
    if ($tld == 'me') {
        // anuv redirects
        if ($domain == 'anuv') anuv();
    }
}

// backup redirect
redirect('http://anuv.me');

?>
