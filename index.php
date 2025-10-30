<?php
if(isset($_GET['check']) && !empty($_GET['check']) && strlen($_GET['check']) >= 10 )
    die(md5('magenet.com'));
?>

<?php
define('_MN_USER', 'fe4f54d3a225a777db39b8e5d134e0321dc6c3bb');
require_once($_SERVER['DOCUMENT_ROOT'].'/'._MN_USER.'/magenet.php');
$magenet = new Magenet();
echo $magenet->getLinks();
?>
